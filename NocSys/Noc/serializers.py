from rest_framework import serializers
from .models import WhatsappSlot, Cliente, Observacao

class WhatsappSlotSerializer(serializers.ModelSerializer):
    media_data = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = WhatsappSlot
        fields = '__all__'

    def validate_conversation_key(self, value):
        if not value:
            raise serializers.ValidationError("conversation_key é obrigatório.")
        return value

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'

# --- NOVO SERIALIZER PARA OBSERVAÇÕES ---
class ObservacaoSerializer(serializers.ModelSerializer):
    autor_username = serializers.CharField(source='autor.username', read_only=True)

    class Meta:
        model = Observacao
        fields = ['id', 'codigo_chamado', 'autor', 'autor_username', 'texto', 'media_file', 'msg_type', 'criado_em']
        read_only_fields = ['autor'] # O autor será pego do request.user