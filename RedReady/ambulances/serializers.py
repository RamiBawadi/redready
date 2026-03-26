from rest_framework import serializers
from .models import Ambulance, AmbulanceItemTemplate


class TemplateSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = AmbulanceItemTemplate
        fields = ["id", "item", "item_name", "required_quantity"]


class AmbulanceSerializer(serializers.ModelSerializer):
    templates = TemplateSerializer(many=True, read_only=True)

    class Meta:
        model = Ambulance
        fields = ["id", "code", "templates"]