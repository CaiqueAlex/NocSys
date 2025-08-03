from django.urls import path, include
from . import views
from django.views.generic.base import RedirectView
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'clientes', views.ClienteViewSet, basename='cliente')

urlpatterns = [
    # Redireciona a raiz do site para /NocSys/
    path('', RedirectView.as_view(pattern_name='main', permanent=False)),

    # APIs do Frontend
    path('api/dashboard/stats/', views.get_dashboard_stats, name='get_dashboard_stats'),
    path('api/user/stats/', views.get_user_stats, name='get_user_stats'),
    path('api/users/', views.get_all_users, name='get_all_users'),
    path('api/chamado/apagar/<str:codigo>/', views.apagar_chamado_por_codigo, name='apagar_chamado_por_codigo'),
    path('api/chamado/atualizar/<str:codigo>/', views.atualizar_chamado, name='atualizar_chamado'),
    path('api/chamado/finalizar/<str:codigo>/', views.finalizar_chamado, name='finalizar_chamado'),
    path('api/chamado/<str:codigo>/observacoes/', views.ObservacaoAPIView.as_view(), name='observacao-api'),
    path('api/graficos/status_chamados/', views.get_grafico_status_chamados, name='get_grafico_status_chamados'),
    
    path('NocSys/', views.main_view, name='main'),
    path('logout/', views.logout_view, name='logout'),

    # --- NOVA URL PARA O PORTÃO DE LOGIN DO ADMIN ---
    path('acesso-restrito/login/', views.admin_login_gate_view, name='admin_login_gate'),

    # APIs para o bot
    path('api/whatsapp-note/', views.WhatsappSlotCreateOrUpdateAPIView.as_view(), name='api-whatsapp-note'),
    path('api/whatsapp-note/<int:pk>/', views.WhatsappSlotCreateOrUpdateAPIView.as_view(), name='api-whatsapp-note-detail'),
    path('api/whatsapp-note/clean-by-key/<path:key>/', views.clean_chamado_by_key, name='api-whatsapp-note-clean-by-key'),
    path('api/get-next-codigo/', views.get_next_codigo, name='api-get-next-codigo'),
    path('api/clientes/numeros/', views.get_cliente_numeros, name='get-cliente-numeros'),

    # APIs para listagem/edição no front
    path('api/whatsapp-slots/', views.WhatsappSlotListAPIView.as_view(), name='api-whatsapp-slot-list'),
    path('api/whatsapp-slots/<int:pk>/', views.WhatsappSlotUpdateAPIView.as_view(), name='api-whatsapp-slot-edit'),

    path('api/', include(router.urls)),
]

# Adicionar para servir arquivos de mídia em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)