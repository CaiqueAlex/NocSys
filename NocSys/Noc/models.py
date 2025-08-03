from django.db import models
import os
import uuid
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

# Função para garantir que o nome do arquivo seja único
def observacao_media_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('observacoes_media', filename)

class WhatsappSlot(models.Model):
    conversation_key = models.CharField(max_length=100)
    contact_name = models.CharField(max_length=150, blank=True, null=True)
    text = models.TextField(blank=True, null=True)
    username = models.CharField(max_length=100)
    duration = models.IntegerField(default=0)

    msg_type = models.CharField(max_length=10, default='text')
    media_file = models.FileField(upload_to='whatsapp_media/', blank=True, null=True)

    suporte = models.CharField(max_length=100, blank=True, null=True)
    cliente = models.CharField(max_length=100, blank=True, null=True)
    resumo = models.CharField(max_length=200, blank=True, null=True)
    problema = models.TextField(blank=True, null=True)
    indicador = models.CharField(max_length=100, blank=True, null=True)
    tempo_solucao = models.CharField(max_length=100, blank=True, null=True)
    solucao = models.TextField(blank=True, null=True)
    setor = models.CharField(max_length=100, blank=True, null=True)
    
    chamadofinalizado = models.BooleanField(default=False)
    codigo_chamado = models.CharField(max_length=100, blank=True, null=True, db_index=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.conversation_key} - {self.criado_em.strftime('%d/%m %H:%M')}"

class Cliente(models.Model):
    nome = models.CharField(max_length=150)
    numero = models.CharField(
        max_length=20, 
        unique=True, 
        help_text="Formato: 5514912345678"
    )
    setor = models.CharField(max_length=100, blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nome']

    def __str__(self):
        return self.nome

class Observacao(models.Model):
    codigo_chamado = models.CharField(max_length=100, db_index=True)
    autor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    texto = models.TextField(blank=True, null=True)
    media_file = models.FileField(upload_to=observacao_media_path, blank=True, null=True)
    msg_type = models.CharField(max_length=20, default='text')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['criado_em']

    def __str__(self):
        return f"Observação para chamado {self.codigo_chamado} por {self.autor.username if self.autor else 'Sistema'}"

# --- MODELO DE PERFIL PARA PRIVILÉGIOS ---
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    adm = models.BooleanField(default=False, help_text="Marque esta opção para conceder privilégios de administrador.")

    def __str__(self):
        return self.user.username

# --- SIGNAL CORRIGIDO PARA CRIAR PERFIL AUTOMATICAMENTE ---
@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, **kwargs):
    """
    Cria um Profile para um usuário assim que ele é criado, ou garante que
    usuários antigos tenham um perfil. Usa get_or_create para evitar erros.
    """
    Profile.objects.get_or_create(user=instance)