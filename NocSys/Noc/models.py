from django.db import models

class WhatsappSlot(models.Model):
    conversation_key = models.CharField(max_length=100)
    contact_name = models.CharField(max_length=150, blank=True, null=True)
    text = models.TextField()
    username = models.CharField(max_length=100)
    duration = models.IntegerField(default=0)

    suporte = models.CharField(max_length=100, blank=True, null=True)
    cliente = models.CharField(max_length=100, blank=True, null=True)
    problema = models.TextField(blank=True, null=True)
    indicador = models.CharField(max_length=100, blank=True, null=True)
    tempo_solucao = models.CharField(max_length=100, blank=True, null=True)

    chamadofinalizado = models.BooleanField(default=False)
    codigo_chamado = models.CharField(max_length=100, blank=True, null=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.conversation_key} - {self.criado_em.strftime('%d/%m %H:%M')}"