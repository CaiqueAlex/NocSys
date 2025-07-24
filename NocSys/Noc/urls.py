from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('home/', views.home_view, name='home'),
    path('logout/', views.logout_view, name='logout'),

    path('api/whatsapp-note/', views.WhatsappSlotCreateOrUpdateAPIView.as_view(), name='api-whatsapp-note'),
    path('api/whatsapp-note/<int:pk>/', views.WhatsappSlotCreateOrUpdateAPIView.as_view(), name='api-whatsapp-note-detail'),

    path('api/whatsapp-slots/', views.WhatsappSlotListAPIView.as_view(), name='api-whatsapp-slot-list'),
    path('api/whatsapp-slots/<int:pk>/', views.WhatsappSlotUpdateAPIView.as_view(), name='api-whatsapp-slot-edit'),

    # NOVA ROTA PARA LISTAR DELETADOS
    path('api/whatsapp-slots-deleted/', views.WhatsappSlotDeletedListAPIView.as_view(), name='api-whatsapp-slot-deleted-list'),
]
