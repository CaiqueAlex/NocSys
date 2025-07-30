from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import SessionAuthentication
from django.db.models import Max, Q, IntegerField
from django.db.models.functions import Cast
from .models import WhatsappSlot
from .serializers import WhatsappSlotSerializer
from django.contrib.auth.models import User
from django.utils import timezone

def format_timespan(td):
    days = td.days
    hours, remainder = divmod(td.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    parts = []
    if days > 0:
        parts.append(f"{days} dia{'s' if days > 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hora{'s' if hours > 1 else ''}")
    if minutes > 0:
        parts.append(f"{minutes} minuto{'s' if minutes > 1 else ''}")
    return ", ".join(parts) if parts else "Menos de um minuto"

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    total_abertos = WhatsappSlot.objects.filter(chamadofinalizado=False).values('codigo_chamado').distinct().count()
    total_finalizados = WhatsappSlot.objects.filter(chamadofinalizado=True).values('codigo_chamado').distinct().count()
    abertos_sem_atribuicao = WhatsappSlot.objects.filter(chamadofinalizado=False, suporte__isnull=True).values('codigo_chamado').distinct().count()
    finalizados_sem_atribuicao = WhatsappSlot.objects.filter(chamadofinalizado=True, suporte__isnull=True).values('codigo_chamado').distinct().count()
    atrasados = 0 
    data = {
        'total_abertos': total_abertos,
        'total_finalizados': total_finalizados,
        'abertos_sem_atribuicao': abertos_sem_atribuicao,
        'finalizados_sem_atribuicao': finalizados_sem_atribuicao,
        'atrasados': atrasados,
    }
    return Response(data, status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_all_users(request):
    users = User.objects.all().order_by('username').values_list('username', flat=True)
    return Response(list(users), status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_user_stats(request):
    user = request.user
    finalizados_count = WhatsappSlot.objects.filter(
        chamadofinalizado=True, 
        codigo_chamado__isnull=False,
        suporte=user.username
    ).values('codigo_chamado').distinct().count()
    data = {
        "username": user.username,
        "email": user.email,
        "full_name": user.get_full_name(),
        "date_joined": user.date_joined,
        "finalizados_count": finalizados_count,
    }
    return Response(data, status=status.HTTP_200_OK)

@api_view(['PATCH'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def atualizar_chamado(request, codigo):
    if not codigo:
        return Response({"detail": "Código do chamado não fornecido."}, status=status.HTTP_400_BAD_REQUEST)
    
    slots_do_chamado = WhatsappSlot.objects.filter(codigo_chamado=codigo)
    if not slots_do_chamado.exists():
        return Response({"detail": f"Nenhum registro encontrado para o chamado #{codigo}."}, status=status.HTTP_404_NOT_FOUND)

    # --- INÍCIO DA CORREÇÃO ---
    # A lógica foi alterada para atualizar SOMENTE o último registro (slot) do chamado.
    # O método .update() em massa foi substituído por .save() em um único objeto.
    
    # 1. Isolar o último registro, que contém os metadados do chamado.
    ultimo_slot = slots_do_chamado.order_by('-criado_em').first()
    if not ultimo_slot:
        return Response({"detail": "Não foi possível encontrar o registro principal do chamado."}, status=status.HTTP_404_NOT_FOUND)

    update_data = request.data
    # 2. Proteger campos que não devem ser editados manualmente.
    update_data.pop('cliente', None)
    update_data.pop('tempo_solucao', None)
    
    # 3. Aplicar as alterações ao objeto do último slot e salvá-lo.
    for key, value in update_data.items():
        setattr(ultimo_slot, key, value)
    
    ultimo_slot.save()
    
    serializer = WhatsappSlotSerializer(ultimo_slot)
    return Response(serializer.data, status=status.HTTP_200_OK)
    # --- FIM DA CORREÇÃO ---

@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def finalizar_chamado(request, codigo):
    slots = WhatsappSlot.objects.filter(codigo_chamado=codigo)
    if not slots.exists():
        return Response({"detail": f"Nenhum registro encontrado para o chamado #{codigo}."}, status=status.HTTP_404_NOT_FOUND)
    primeiro_slot = slots.order_by('criado_em').first()
    if not primeiro_slot:
        return Response({"detail": "Não foi possível encontrar o início do chamado."}, status=status.HTTP_400_BAD_REQUEST)
    data_abertura = primeiro_slot.criado_em
    data_finalizacao = timezone.now()
    duracao = data_finalizacao - data_abertura
    tempo_solucao_str = format_timespan(duracao)
    
    # Esta atualização em massa está correta para esta ação,
    # pois todos os registros do chamado devem ser marcados como finalizados.
    slots.update(
        chamadofinalizado=True,
        tempo_solucao=tempo_solucao_str
    )
    return Response({"detail": "Chamado finalizado com sucesso."}, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def apagar_chamado_por_codigo(request, codigo):
    if not codigo:
        return Response({"detail": "Código do chamado não fornecido."}, status=status.HTTP_400_BAD_REQUEST)
    count, _ = WhatsappSlot.objects.filter(codigo_chamado=codigo).delete()
    if count > 0:
        return Response({"detail": f"{count} registros do chamado #{codigo} foram apagados."}, status=status.HTTP_200_OK)
    else:
        return Response({"detail": f"Nenhum registro encontrado para o chamado #{codigo}."}, status=status.HTTP_404_NOT_FOUND)

def main_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('main')
        else:
            return render(request, 'main.html', {'error': 'Usuário ou senha inválidos.'})
    return render(request, 'main.html')

@login_required(login_url='main')
def logout_view(request):
    logout(request)
    return redirect('main')

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def get_next_codigo(request):
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
            if not is_finalizado and 'conversation_key' in request.query_params:
                 qs_filter &= Q(codigo_chamado__isnull=True)
        slots = WhatsappSlot.objects.filter(qs_filter).order_by('criado_em')
        serializer = WhatsappSlotSerializer(slots, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy()
        if 'contact_name' in data:
            data['cliente'] = data['contact_name']
        serializer = WhatsappSlotSerializer(data=data)
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
    serializer_class = WhatsappSlotSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = WhatsappSlot.objects.all().order_by('criado_em')
        finalizado = self.request.query_params.get('finalizado')
        if finalizado is not None:
            is_finalizado = finalizado.lower() in ['1', 'true', 'sim', 'yes']
            qs = qs.filter(chamadofinalizado=is_finalizado, codigo_chamado__isnull=False)
        return qs

class WhatsappSlotUpdateAPIView(RetrieveUpdateAPIView):
    queryset = WhatsappSlot.objects.all()
    serializer_class = WhatsappSlotSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]