from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from django.db.models import Max, Q, IntegerField
from django.db.models.functions import Cast
from .models import WhatsappSlot
from .serializers import WhatsappSlotSerializer

def main_view(request):
    # Processa o formulário de login via POST
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('main')  # Redireciona para a mesma página, que agora mostrará a home
        else:
            # Renderiza a página novamente com uma mensagem de erro
            return render(request, 'main.html', {'error': 'Usuário ou senha inválidos.'})

    # Para requisições GET, apenas renderiza a página.
    # O template decidirá o que mostrar com base no status de autenticação.
    return render(request, 'main.html')

@login_required(login_url='main') # Aponta para a nova view principal caso o acesso seja negado
def logout_view(request):
    logout(request)
    return redirect('main') # Redireciona para a página principal (que mostrará o login)

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def get_next_codigo(request):
    # CORREÇÃO APLICADA AQUI:
    # Converte o campo 'codigo_chamado' (que é texto) para um Inteiro antes de agregar.
    # Isso garante que a comparação seja numérica (10 > 9) e não alfabética ('9' > '10').
    max_codigo_obj = WhatsappSlot.objects.annotate(
        codigo_as_int=Cast('codigo_chamado', output_field=IntegerField())
    ).aggregate(max_codigo=Max('codigo_as_int'))

    max_num = max_codigo_obj['max_codigo'] or 0
    
    novo_codigo = str(max_num + 1)
    return Response({"codigo": novo_codigo})

@api_view(['DELETE'])
@permission_classes([AllowAny])
@authentication_classes([])
def clean_chamado_by_key(request, key):
    """Apaga TODOS os registros desta conversation_key que ainda não foram finalizados."""
    count, _ = WhatsappSlot.objects.filter(
        conversation_key=key,
        chamadofinalizado=False
    ).delete()
    return Response({"detail": f"{count} mensagens descartadas"}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class WhatsappSlotCreateOrUpdateAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        qs_filter = Q()
        conversation_key = request.query_params.get('conversation_key')
        finalizado = request.query_params.get('finalizado')

        if conversation_key:
            qs_filter &= Q(conversation_key=conversation_key)

        if finalizado is not None:
            is_finalizado = finalizado.lower() in ['1', 'true', 'sim', 'yes']
            qs_filter &= Q(chamadofinalizado=is_finalizado)
            # Ao buscar em aberto, só queremos os que não têm código ainda
            # Esta lógica pode precisar de ajuste dependendo do fluxo exato
            if not is_finalizado and 'conversation_key' in request.query_params:
                 qs_filter &= Q(codigo_chamado__isnull=True)


        slots = WhatsappSlot.objects.filter(qs_filter).order_by('criado_em')
        serializer = WhatsappSlotSerializer(slots, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = WhatsappSlotSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk=None):
        if not pk:
            return Response({"detail": "ID do slot é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            slot = WhatsappSlot.objects.get(pk=pk)
            serializer = WhatsappSlotSerializer(slot, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except WhatsappSlot.DoesNotExist:
            return Response({"detail": "Slot não encontrado"}, status=status.HTTP_404_NOT_FOUND)


class WhatsappSlotListAPIView(ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = WhatsappSlotSerializer

    def get_queryset(self):
        qs = WhatsappSlot.objects.all().order_by('criado_em')
        finalizado = self.request.query_params.get('finalizado')
        if finalizado is not None:
            is_finalizado = finalizado.lower() in ['1', 'true', 'sim', 'yes']
            # Para a listagem geral, queremos apenas os que JÁ TÊM um código
            qs = qs.filter(chamadofinalizado=is_finalizado, codigo_chamado__isnull=False)
        return qs

class WhatsappSlotUpdateAPIView(RetrieveUpdateAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    queryset = WhatsappSlot.objects.all()
    serializer_class = WhatsappSlotSerializer