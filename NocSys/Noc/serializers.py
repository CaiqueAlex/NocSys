from rest_framework import serializers
from .models import WhatsappSlot

class WhatsappSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsappSlot
        fields = '__all__'

    def validate_conversation_key(self, value):
        if not value:
            raise serializers.ValidationError("conversation_key é obrigatório.")
        return value
