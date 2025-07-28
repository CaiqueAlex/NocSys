from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('home/', views.home_view, name='home'),
    path('logout/', views.logout_view, name='logout'),

    # API para o bot
    path('api/whatsapp-note/', views.WhatsappSlotCreateOrUpdateAPIView.as_view(), name='api-whatsapp-note'),
    path('api/whatsapp-note/<int:pk>/', views.WhatsappSlotCreateOrUpdateAPIView.as_view(), name='api-whatsapp-note-detail'),
    path('api/whatsapp-note/clean-by-key/<path:key>/', views.clean_chamado_by_key, name='api-whatsapp-note-clean-by-key'),
    path('api/get-next-codigo/', views.get_next_codigo, name='api-get-next-codigo'),

    # APIs para o front
    path('api/whatsapp-slots/', views.WhatsappSlotListAPIView.as_view(), name='api-whatsapp-slot-list'),
    path('api/whatsapp-slots/<int:pk>/', views.WhatsappSlotUpdateAPIView.as_view(), name='api-whatsapp-slot-edit'),
]