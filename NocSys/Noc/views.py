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
from django.db.models import Max, Q
from .models import WhatsappSlot
from .serializers import WhatsappSlotSerializer

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            next_url = request.POST.get('next') or 'home'
            return redirect(next_url)
        else:
            return render(request, 'login.html', {'error': 'Usuário ou senha inválidos.'})
    return render(request, 'login.html')

@login_required(login_url='login')
def home_view(request):
    return render(request, 'home.html')

@login_required(login_url='login')
def logout_view(request):
    logout(request)
    return redirect('login')

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def get_next_codigo(request):
    max_codigo_str = WhatsappSlot.objects.aggregate(Max('codigo_chamado'))['codigo_chamado__max']
    try:
        max_num = int(max_codigo_str) if max_codigo_str else 0
    except (TypeError, ValueError):
        max_num = 0
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
            if not is_finalizado:
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
            qs = qs.filter(chamadofinalizado=is_finalizado)
        return qs

class WhatsappSlotUpdateAPIView(RetrieveUpdateAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    queryset = WhatsappSlot.objects.all()
    serializer_class = WhatsappSlotSerializer