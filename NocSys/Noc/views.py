from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status, viewsets
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import SessionAuthentication
from django.db.models import Max, Q, IntegerField, Min, Count
from django.db.models.functions import Cast
from .models import WhatsappSlot, Cliente, Observacao, Profile
from .serializers import WhatsappSlotSerializer, ClienteSerializer, ObservacaoSerializer
from django.contrib.auth.models import User
from django.utils import timezone
import base64
import uuid
from django.core.files.base import ContentFile
from rest_framework.parsers import MultiPartParser, FormParser
import mimetypes
from django.conf import settings
from django.urls import reverse

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('nome')
    serializer_class = ClienteSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
@permission_classes([AllowAny])
def get_cliente_numeros(request):
    numeros = Cliente.objects.values_list('numero', flat=True)
    return Response([f"{n}@c.us" for n in numeros], status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_grafico_status_chamados(request):
    try:
        is_admin = request.user.profile.adm
    except Profile.DoesNotExist:
        is_admin = False

    # Se for admin, retorna dados detalhados por usuário
    if is_admin:
        users = User.objects.filter(is_active=True).order_by('username')
        user_stats = []
        now = timezone.now()
        
        for user in users:
            finalizados = WhatsappSlot.objects.filter(suporte=user.username, chamadofinalizado=True).values('codigo_chamado').distinct().count()
            atribuidos = WhatsappSlot.objects.filter(suporte=user.username, chamadofinalizado=False).values('codigo_chamado').distinct().count()
            
            atrasados = WhatsappSlot.objects.filter(
                suporte=user.username, chamadofinalizado=False
            ).values('codigo_chamado').annotate(
                data_abertura=Min('criado_em')
            ).filter(
                data_abertura__lt=now - timezone.timedelta(days=20)
            ).count()

            user_stats.append({
                'username': user.username,
                'finalizados': finalizados,
                'atribuidos': atribuidos,
                'atrasados': atrasados
            })
        
        # Filtra usuários que não têm estatísticas para não poluir o gráfico
        user_stats = [stat for stat in user_stats if stat['finalizados'] > 0 or stat['atribuidos'] > 0 or stat['atrasados'] > 0]

        data = {
            'type': 'admin',
            'data': user_stats
        }
        return Response(data)

    # Se não for admin, retorna os dados gerais (lógica original corrigida)
    else:
        codigos_finalizados = WhatsappSlot.objects.filter(chamadofinalizado=True, codigo_chamado__isnull=False).values_list('codigo_chamado', flat=True).distinct()
        codigos_abertos_atribuidos = WhatsappSlot.objects.filter(chamadofinalizado=False, suporte__isnull=False, suporte__gt='', codigo_chamado__isnull=False).values_list('codigo_chamado', flat=True).distinct()
        
        codigos_atribuidos_set = set(codigos_abertos_atribuidos)
        
        codigos_abertos_total = WhatsappSlot.objects.filter(
            chamadofinalizado=False, codigo_chamado__isnull=False
        ).values_list('codigo_chamado', flat=True).distinct()

        codigos_nao_atribuidos_count = len(set(codigos_abertos_total) - codigos_atribuidos_set)

        data = {
            'type': 'user',
            'data': {
                'labels': ['Resolvidos', 'Em Aberto (Atribuídos)', 'Em Aberto (Não Atribuídos)'],
                'counts': [len(codigos_finalizados), len(codigos_atribuidos_set), codigos_nao_atribuidos_count]
            }
        }
        return Response(data)

def format_timespan(td):
    days, remainder = divmod(td.total_seconds(), 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, _ = divmod(remainder, 60)
    parts = []
    if int(days) > 0:
        parts.append(f"{int(days)} dia{'s' if int(days) > 1 else ''}")
    if int(hours) > 0:
        parts.append(f"{int(hours)} hora{'s' if int(hours) > 1 else ''}")
    if int(minutes) > 0:
        parts.append(f"{int(minutes)} minuto{'s' if int(minutes) > 1 else ''}")
    
    return ", ".join(parts) if parts else "Menos de um minuto"

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    total_abertos = WhatsappSlot.objects.filter(
        chamadofinalizado=False, codigo_chamado__isnull=False
    ).values('codigo_chamado').distinct().count()

    total_finalizados = WhatsappSlot.objects.filter(
        chamadofinalizado=True, codigo_chamado__isnull=False
    ).values('codigo_chamado').distinct().count()
    
    codigos_atribuidos = WhatsappSlot.objects.filter(
        chamadofinalizado=False, 
        suporte__isnull=False,
        suporte__gt=''
    ).values_list('codigo_chamado', flat=True).distinct()

    abertos_sem_atribuicao = WhatsappSlot.objects.filter(
        chamadofinalizado=False,
        codigo_chamado__isnull=False
    ).exclude(
        codigo_chamado__in=set(codigos_atribuidos)
    ).values('codigo_chamado').distinct().count()
    
    now = timezone.now()
    atrasados_count = WhatsappSlot.objects.filter(
        chamadofinalizado=False, codigo_chamado__isnull=False
    ).values('codigo_chamado').annotate(
        data_abertura=Min('criado_em')
    ).filter(
        data_abertura__lt=now - timezone.timedelta(days=20)
    ).count()

    return Response({
        'total_abertos': total_abertos,
        'total_finalizados': total_finalizados,
        'abertos_sem_atribuicao': abertos_sem_atribuicao,
        'atrasados': atrasados_count,
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
def get_all_users(request):
    users = User.objects.all().order_by('username').values_list('username', flat=True)
    return Response(list(users))

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_user_stats(request):
    user = request.user
    finalizados_count = WhatsappSlot.objects.filter(chamadofinalizado=True, codigo_chamado__isnull=False, suporte=user.username).values('codigo_chamado').distinct().count()
    
    try:
        is_admin = user.profile.adm
    except Profile.DoesNotExist:
        is_admin = False

    return Response({
        "username": user.username, 
        "email": user.email, 
        "full_name": user.get_full_name(),
        "date_joined": user.date_joined, 
        "finalizados_count": finalizados_count,
        "is_admin": is_admin
    })

@api_view(['PATCH'])
@authentication_classes([SessionAuthentication])
def atualizar_chamado(request, codigo):
    slots_do_chamado = WhatsappSlot.objects.filter(codigo_chamado=codigo)
    if not slots_do_chamado.exists():
        return Response({"detail": "Chamado não encontrado."}, status=status.HTTP_404_NOT_FOUND)
    
    dados_para_atualizar = {}
    allowed_fields = ['suporte', 'resumo', 'problema', 'solucao', 'indicador']
    for field in allowed_fields:
        if field in request.data:
            dados_para_atualizar[field] = request.data[field]
            
    if dados_para_atualizar:
        slots_do_chamado.update(**dados_para_atualizar)

    ultimo_slot = slots_do_chamado.latest('criado_em')
    serializer = WhatsappSlotSerializer(ultimo_slot)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
def finalizar_chamado(request, codigo):
    slots = WhatsappSlot.objects.filter(codigo_chamado=codigo)
    if not slots.exists():
        return Response({"detail": "Chamado não encontrado."}, status=status.HTTP_404_NOT_FOUND)
    primeiro_slot = slots.earliest('criado_em')
    tempo_solucao_str = format_timespan(timezone.now() - primeiro_slot.criado_em)
    slots.update(chamadofinalizado=True, tempo_solucao=tempo_solucao_str)
    return Response({"detail": "Chamado finalizado com sucesso."})

@api_view(['DELETE'])
@authentication_classes([SessionAuthentication])
def apagar_chamado_por_codigo(request, codigo):
    count, _ = WhatsappSlot.objects.filter(codigo_chamado=codigo).delete()
    if count > 0:
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response({"detail": "Chamado não encontrado."}, status=status.HTTP_404_NOT_FOUND)

def main_view(request):
    if request.method == 'POST':
        user = authenticate(request, username=request.POST.get('username'), password=request.POST.get('password'))
        if user:
            login(request, user)
            return redirect('main')
        return render(request, 'main.html', {'error': 'Usuário ou senha inválidos.'})
    return render(request, 'main.html')

@login_required(login_url='main')
def logout_view(request):
    logout(request)
    return redirect('main')

@api_view(['GET'])
@permission_classes([AllowAny])
def get_next_codigo(request):
    max_codigo = WhatsappSlot.objects.aggregate(max_codigo=Max(Cast('codigo_chamado', IntegerField())))['max_codigo']
    return Response({"codigo": str((max_codigo or 0) + 1)})

@api_view(['DELETE'])
@permission_classes([AllowAny])
def clean_chamado_by_key(request, key):
    WhatsappSlot.objects.filter(conversation_key=key, chamadofinalizado=False).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

class ObservacaoAPIView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, codigo, *args, **kwargs):
        observacoes = Observacao.objects.filter(codigo_chamado=codigo)
        serializer = ObservacaoSerializer(observacoes, many=True)
        return Response(serializer.data)

    def post(self, request, codigo, *args, **kwargs):
        if not WhatsappSlot.objects.filter(codigo_chamado=codigo).exists():
            return Response({"detail": "Chamado não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['codigo_chamado'] = codigo

        if 'media_file' in data and data['media_file']:
            mime_type, _ = mimetypes.guess_type(data['media_file'].name)
            if mime_type:
                if mime_type.startswith('image'):
                    data['msg_type'] = 'image'
                elif mime_type.startswith('audio'):
                    data['msg_type'] = 'audio'
                elif mime_type.startswith('video'):
                    data['msg_type'] = 'video'
                else:
                    data['msg_type'] = 'document'
            else:
                data['msg_type'] = 'document'
        else:
            data['msg_type'] = 'text'

        serializer = ObservacaoSerializer(data=data)
        if serializer.is_valid():
            serializer.save(autor=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class WhatsappSlotCreateOrUpdateAPIView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        data = request.data.copy()
        if 'contact_name' in data and data['contact_name'] != 'Suporte':
            data['cliente'] = data['contact_name']
        
        numero_cliente_sem_arroba = data.get('username', '').replace('@c.us', '')
        cliente_obj = Cliente.objects.filter(numero=numero_cliente_sem_arroba).first()

        if cliente_obj:
            if not data.get('cliente') or data.get('cliente') == numero_cliente_sem_arroba:
                 data['cliente'] = cliente_obj.nome
            if cliente_obj.setor:
                 data['setor'] = cliente_obj.setor

        serializer = WhatsappSlotSerializer(data=data)
        if serializer.is_valid():
            media_data_b64 = serializer.validated_data.pop('media_data', None)
            slot_instance = serializer.save()

            if media_data_b64:
                try:
                    format, imgstr = media_data_b64.split(';base64,') 
                    ext = format.split('/')[-1].split(';')[0]
                    filename = f"{uuid.uuid4()}.{ext}"
                    decoded_file = ContentFile(base64.b64decode(imgstr), name=filename)
                    slot_instance.media_file.save(filename, decoded_file, save=True)
                except Exception as e:
                    slot_instance.delete()
                    return Response({"detail": f"Erro ao processar arquivo de mídia: {e}"}, status=status.HTTP_400_BAD_REQUEST)
            
            final_data = WhatsappSlotSerializer(slot_instance).data
            return Response(final_data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk=None):
        try:
            slot = WhatsappSlot.objects.get(pk=pk)
        except WhatsappSlot.DoesNotExist:
            return Response({"detail": "Slot não encontrado."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = WhatsappSlotSerializer(slot, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WhatsappSlotListAPIView(ListAPIView):
    serializer_class = WhatsappSlotSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        is_finalizado = self.request.query_params.get('finalizado') in ['1', 'true', 'sim', 'yes']
        codigos = WhatsappSlot.objects.filter(
            chamadofinalizado=is_finalizado, codigo_chamado__isnull=False
        ).values_list('codigo_chamado', flat=True).distinct()
        return WhatsappSlot.objects.filter(codigo_chamado__in=codigos).order_by('codigo_chamado', 'criado_em')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        chamados_agrupados = {}
        for slot in queryset:
            codigo = slot.codigo_chamado
            if codigo not in chamados_agrupados:
                chamados_agrupados[codigo] = []
            chamados_agrupados[codigo].append(slot)

        dados_finais = []
        now = timezone.now()
        for codigo, slots in chamados_agrupados.items():
            primeiro_slot = slots[0]
            ultimo_slot = slots[-1]
            
            cliente_correto = next((s.cliente for s in slots if s.cliente and s.cliente != 'Suporte'), 'Cliente Desconhecido')
            suporte_correto = next((s.suporte for s in reversed(slots) if s.suporte and s.suporte.strip()), None)
            problema_texto = next((s.problema for s in slots if s.problema and s.problema.strip()), None)
            setor_texto = next((s.setor for s in slots if s.setor and s.setor.strip()), None)
            
            dados_consolidados = {
                'cliente': cliente_correto,
                'suporte': suporte_correto,
                'problema': problema_texto, 
                'setor': setor_texto,
                'resumo': ultimo_slot.resumo, 
                'solucao': ultimo_slot.solucao,
                'indicador': ultimo_slot.indicador,
                'tempo_solucao': ultimo_slot.tempo_solucao,
            }
            
            atraso_status = None
            if not ultimo_slot.chamadofinalizado:
                dias_em_aberto = (now - primeiro_slot.criado_em).days
                if dias_em_aberto > 20: atraso_status = "Atrasado!"
                elif dias_em_aberto > 10: atraso_status = "Atenção!"
                else: atraso_status = "Ok!"
            
            for slot in slots:
                slot_data = self.get_serializer(slot).data
                slot_data.update(dados_consolidados)
                slot_data['atraso_status'] = atraso_status
                dados_finais.append(slot_data)
        
        return Response(dados_finais)

class WhatsappSlotUpdateAPIView(RetrieveUpdateAPIView):
    queryset = WhatsappSlot.objects.all()
    serializer_class = WhatsappSlotSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

def admin_login_gate_view(request):
    admin_index_url = reverse('admin:index')

    if request.session.get('admin_gate_passed'):
        return redirect(admin_index_url)

    error_message = None
    if request.method == 'POST':
        entered_password = request.POST.get('password')
        correct_password = getattr(settings, 'ADMIN_ACCESS_PASSWORD', None)

        if entered_password and entered_password == correct_password:
            request.session['admin_gate_passed'] = True
            return redirect(request.GET.get('next', admin_index_url))
        else:
            error_message = "Senha de acesso incorreta. Tente novamente."
    
    return render(request, 'admin_gate.html', {
        'error_message': error_message,
        'app_title': 'NocSys - Acesso Restrito'
    })