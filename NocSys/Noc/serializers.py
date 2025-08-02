from rest_framework import serializers
from .models import WhatsappSlot, Cliente

class WhatsappSlotSerializer(serializers.ModelSerializer):
    # --- CAMPO ADICIONADO ---
    # Campo virtual para receber dados em base64 do bot
    media_data = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = WhatsappSlot
        fields = '__all__'

    def validate_conversation_key(self, value):
        if not value:
            raise serializers.ValidationError("conversation_key é obrigatório.")
        return value

# NOVO SERIALIZER ADICIONADO
class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'