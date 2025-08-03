from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Cliente, WhatsappSlot, Observacao, Profile

# --- MODELO DE PERFIL INTEGRADO AO ADMIN DO USUÁRIO ---
class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Perfil de Permissões'
    fk_name = 'user'

class UserAdmin(BaseUserAdmin):
    inlines = (ProfileInline,)

# Re-registra o User admin para incluir o Profile
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('nome', 'numero', 'setor', 'criado_em')
    search_fields = ('nome', 'numero', 'setor')

@admin.register(WhatsappSlot)
class WhatsappSlotAdmin(admin.ModelAdmin):
    list_display = ('codigo_chamado', 'cliente', 'suporte', 'resumo', 'chamadofinalizado', 'criado_em')
    list_filter = ('chamadofinalizado', 'suporte')
    search_fields = ('codigo_chamado', 'cliente', 'suporte', 'resumo', 'problema')

@admin.register(Observacao)
class ObservacaoAdmin(admin.ModelAdmin):
    list_display = ('codigo_chamado', 'autor', 'msg_type', 'criado_em')
    search_fields = ('codigo_chamado', 'autor__username')