from django.urls import path
from . import views
from django.views.generic.base import RedirectView

urlpatterns = [
    # Redireciona a raiz do site para /NocSys/
    path('', RedirectView.as_view(pattern_name='main', permanent=False)),

    # APIs do Frontend para gerenciamento de chamados e usuário
    path('api/dashboard/stats/', views.get_dashboard_stats, name='get_dashboard_stats'),
    path('api/user/stats/', views.get_user_stats, name='get_user_stats'),
    path('api/users/', views.get_all_users, name='get_all_users'),
    path('api/chamado/apagar/<str:codigo>/', views.apagar_chamado_por_codigo, name='apagar_chamado_por_codigo'),
    path('api/chamado/atualizar/<str:codigo>/', views.atualizar_chamado, name='atualizar_chamado'),
    path('api/chamado/finalizar/<str:codigo>/', views.finalizar_chamado, name='finalizar_chamado'),
    
    # URL principal da aplicação
    path('NocSys/', views.main_view, name='main'),
    
    # URL de Logout
    path('logout/', views.logout_view, name='logout'),

    # APIs para o bot
    path('api/whatsapp-note/', views.WhatsappSlotCreateOrUpdateAPIView.as_view(), name='api-whatsapp-note'),
    path('api/whatsapp-note/<int:pk>/', views.WhatsappSlotCreateOrUpdateAPIView.as_view(), name='api-whatsapp-note-detail'),
    path('api/whatsapp-note/clean-by-key/<path:key>/', views.clean_chamado_by_key, name='api-whatsapp-note-clean-by-key'),
    path('api/get-next-codigo/', views.get_next_codigo, name='api-get-next-codigo'),

    # APIs para o front
    path('api/whatsapp-slots/', views.WhatsappSlotListAPIView.as_view(), name='api-whatsapp-slot-list'),
    path('api/whatsapp-slots/<int:pk>/', views.WhatsappSlotUpdateAPIView.as_view(), name='api-whatsapp-slot-edit'),
]