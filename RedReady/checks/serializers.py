from rest_framework import serializers
from .models import AmbulanceCheck, CheckItem


class CheckItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    required_quantity = serializers.SerializerMethodField()

    class Meta:
        model = CheckItem
        fields = [
            "id",
            "item",
            "item_name",
            "available_quantity",
            "required_quantity", 
            "value",
            "is_flagged",
            "note",
            "is_checked",
        ]

    def get_required_quantity(self, obj):
        template = obj.connected_check.ambulance.templates.filter(
            item=obj.item
        ).first()

        return template.required_quantity if template else 0


class AmbulanceCheckSerializer(serializers.ModelSerializer):
    items = CheckItemSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    status = serializers.SerializerMethodField()          # ✅ NEW
    missing_count = serializers.SerializerMethodField()   # ✅ NEW

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
            "status",          
            "missing_count", 
        ]

    def get_status(self, obj):
        from .utils import calculate_status
        status, _ = calculate_status(obj)
        return status

    def get_missing_count(self, obj):
        from .utils import calculate_status
        _, missing = calculate_status(obj)
        return missing