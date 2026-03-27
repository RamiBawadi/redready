from rest_framework import serializers
from .models import AmbulanceCheck, CheckItem


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
            "is_checked",
        ]


class AmbulanceCheckSerializer(serializers.ModelSerializer):
    items = CheckItemSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = AmbulanceCheck
        fields = [
            "id",
            "ambulance",
            "user_email",
            "user_full_name",   
            "shift",
            "date",
            "time",           
            "items",
        ]