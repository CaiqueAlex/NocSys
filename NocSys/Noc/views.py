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

from django.db.models import Max, Q

from .models import WhatsappSlot
from .serializers import WhatsappSlotSerializer


# === VIEWS DE LOGIN / LOGOUT / HOME ===

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


# === API DE CRIAÇÃO, CONSULTA, ATUALIZAÇÃO E DELETE ===

@method_decorator(csrf_exempt, name='dispatch')
class WhatsappSlotCreateOrUpdateAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        conversation_key = request.query_params.get('conversation_key')
        conversation_key_prefix = request.query_params.get('conversation_key__startswith')
        finalizado = request.query_params.get('finalizado')
        apagado = request.query_params.get('apagado')

        if not conversation_key and not conversation_key_prefix:
            return Response({"detail": "conversation_key ou conversation_key__startswith é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

        qs_filter = Q()
        if conversation_key:
            qs_filter &= Q(conversation_key=conversation_key)
        if conversation_key_prefix:
            qs_filter &= Q(conversation_key__startswith=conversation_key_prefix)
        if finalizado is not None:
            if finalizado.lower() in ['1', 'true', 'sim', 'yes']:
                qs_filter &= Q(chamadofinalizado=True)
            elif finalizado.lower() in ['0', 'false', 'nao', 'não', 'no']:
                qs_filter &= Q(chamadofinalizado=False)
        if apagado is not None:
            if apagado.lower() in ['1', 'true', 'sim', 'yes']:
                qs_filter &= Q(deletado=True)
            elif apagado.lower() in ['0', 'false', 'nao', 'não', 'no']:
                qs_filter &= Q(deletado=False)

        slots = WhatsappSlot.objects.filter(qs_filter).order_by('criado_em')
        serializer = WhatsappSlotSerializer(slots, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data
        conversation_key = data.get('conversation_key')
        if not conversation_key:
            return Response({"detail": "conversation_key é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

        # Busca se já existe chamado aberto para esse conversation_key
        chamado_aberto = WhatsappSlot.objects.filter(
            conversation_key=conversation_key,
            chamadofinalizado=False,
            deletado=False
        ).order_by('-criado_em').first()

        if chamado_aberto:
            novo_slot_data = data.copy()
            novo_slot_data['codigo_chamado'] = chamado_aberto.codigo_chamado
            novo_slot_data['chamadofinalizado'] = False
            novo_slot_data['deletado'] = False

            serializer = WhatsappSlotSerializer(data=novo_slot_data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        else:
            # Ao criar um primeiro slot de um novo atendimento, não precisa gerar código ainda.
            # O código só é gerado na finalização.
            novo_slot_data = data.copy()
            novo_slot_data['codigo_chamado'] = None
            novo_slot_data['chamadofinalizado'] = False
            novo_slot_data['deletado'] = False

            serializer = WhatsappSlotSerializer(data=novo_slot_data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk=None):
        if not pk:
            return Response({"detail": "ID do slot é obrigatório para atualizar"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            slot = WhatsappSlot.objects.get(pk=pk, deletado=False)
        except WhatsappSlot.DoesNotExist:
            return Response({"detail": "Slot não encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Atualiza campos normais
        slot.text = request.data.get('text', slot.text)
        slot.suporte = request.data.get('suporte', slot.suporte)
        slot.cliente = request.data.get('cliente', slot.cliente)
        slot.problema = request.data.get('problema', slot.problema)
        slot.indicador = request.data.get('indicador', slot.indicador)
        slot.tempo_solucao = request.data.get('tempo_solucao', slot.tempo_solucao)

        # Se for finalização, finaliza SOMENTE slots ainda abertos deste atendimento
        novo_finalizado = request.data.get('chamadofinalizado', None)
        if novo_finalizado is not None:
            if str(novo_finalizado).lower() in ['true', '1', 'sim', 'yes']:
                if not slot.chamadofinalizado:
                    max_codigo = WhatsappSlot.objects.aggregate(Max('codigo_chamado'))['codigo_chamado__max']
                    try:
                        max_num = int(max_codigo)
                    except (TypeError, ValueError):
                        max_num = 0
                    codigo_novo = str(max_num + 1)

                    # ALTERAÇÃO CRÍTICA: Filtra apenas os slots EM ABERTO deste conversation_key
                    slots_abertos = WhatsappSlot.objects.filter(
                        conversation_key=slot.conversation_key,
                        deletado=False,
                        chamadofinalizado=False
                    )
                    for s in slots_abertos:
                        s.chamadofinalizado = True
                        s.codigo_chamado = codigo_novo
                        s.save()

                    # Retorna o código gerado para o bot usar
                    return Response({"detail": "Chamado finalizado com sucesso", "codigo_chamado": codigo_novo}, status=status.HTTP_200_OK)
            else:
                slot.chamadofinalizado = False
                slot.save()

        serializer = WhatsappSlotSerializer(slot)
        return Response(serializer.data)

    def delete(self, request, pk=None):
        if not pk:
            return Response({"detail": "ID do slot é obrigatório para deletar"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            slot = WhatsappSlot.objects.get(pk=pk, deletado=False)
            slot.deletado = True
            slot.save()
            return Response({"detail": "Chamado marcado como deletado"}, status=status.HTTP_200_OK)
        except WhatsappSlot.DoesNotExist:
            return Response({"detail": "Slot não encontrado"}, status=status.HTTP_404_NOT_FOUND)


# === LISTAGEM DE CHAMADOS ===

class WhatsappSlotListAPIView(ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = WhatsappSlotSerializer

    def get_queryset(self):
        finalizado = self.request.query_params.get('finalizado')
        apagado = self.request.query_params.get('apagado')

        qs = WhatsappSlot.objects.filter(deletado=False).order_by('criado_em')

        if finalizado is not None:
            if finalizado.lower() in ['1', 'true', 'sim', 'yes']:
                qs = qs.filter(chamadofinalizado=True)
            elif finalizado.lower() in ['0', 'false', 'nao', 'não', 'no']:
                qs = qs.filter(chamadofinalizado=False)

        if apagado is not None:
            if apagado.lower() in ['1', 'true', 'sim', 'yes']:
                qs = qs.filter(deletado=True)
            elif apagado.lower() in ['0', 'false', 'nao', 'não', 'no']:
                qs = qs.filter(deletado=False)

        return qs


class WhatsappSlotDeletedListAPIView(ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = WhatsappSlotSerializer

    def get_queryset(self):
        return WhatsappSlot.objects.filter(deletado=True).order_by('criado_em')


@method_decorator(csrf_exempt, name='dispatch')
class WhatsappSlotUpdateAPIView(RetrieveUpdateAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    queryset = WhatsappSlot.objects.filter(deletado=False)
    serializer_class = WhatsappSlotSerializer