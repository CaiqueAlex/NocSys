from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Primeiro, defina a lista principal de URLs
urlpatterns = [
    # ALTERAÇÃO: A URL do admin foi trocada de 'admin/' para algo secreto.
    # Troque 'sua-url-secreta-aqui/' por um nome que só você saiba.
    # Exemplo: 'gestao-do-sistema-4a7b2c/'
    path('webadmin/', admin.site.urls),

    # O resto das suas URLs permanece igual.
    path('', include('Noc.urls')),
]

# Depois, adicione as URLs de mídia condicionalmente
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)