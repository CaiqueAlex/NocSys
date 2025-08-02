from django.db import models

class WhatsappSlot(models.Model):
    conversation_key = models.CharField(max_length=100)
    contact_name = models.CharField(max_length=150, blank=True, null=True)
    text = models.TextField(blank=True, null=True)
    username = models.CharField(max_length=100)
    duration = models.IntegerField(default=0)

    # --- CAMPOS ALTERADOS/ADICIONADOS ---
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
    codigo_chamado = models.CharField(max_length=100, blank=True, null=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.conversation_key} - {self.criado_em.strftime('%d/%m %H:%M')}"

# NOVO MODELO ADICIONADO
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