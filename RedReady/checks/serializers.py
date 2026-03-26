from rest_framework import serializers
from .models import AmbulanceCheck, CheckItem
from items.models import Item


class CheckItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = CheckItem
        fields = [
            "id",
            "item",
            "item_name",
            "available_quantity",
            "value",
            "is_flagged",
            "note",
        ]


class AmbulanceCheckSerializer(serializers.ModelSerializer):
    items = CheckItemSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = AmbulanceCheck
        fields = [
            "id",
            "ambulance",
            "user",
            "user_email",
            "shift",
            "date",
            "time",
            "items",
        ]



class CheckItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name")

    class Meta:
        model = CheckItem
        fields = ["item_name", "available_quantity", "is_flagged", "note"]


class AmbulanceCheckSerializer(serializers.ModelSerializer):
    items = CheckItemSerializer(many=True)
    user_email = serializers.CharField(source="user.email")

    class Meta:
        model = AmbulanceCheck
        fields = ["id", "date", "shift", "user_email", "items"]