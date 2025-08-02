from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Primeiro, defina a lista principal de URLs
urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('Noc.urls')),
]

# Depois, adicione as URLs de mídia condicionalmente
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)