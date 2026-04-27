from rest_framework import serializers
from .models import AmbulanceCheck, CheckItem
from .utils import calculate_status


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
        # ✅ Use prefetched templates from context instead of hitting DB
        templates = self.context.get("templates", {})
        return templates.get(obj.item_id, 0)


class AmbulanceCheckSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    status = serializers.SerializerMethodField()
    missing_count = serializers.SerializerMethodField()

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

    def _get_status_data(self, obj):
        # ✅ Cache result so calculate_status only runs ONCE per check
        if not hasattr(obj, '_cached_status'):
            obj._cached_status = calculate_status(obj)
        return obj._cached_status

    def get_status(self, obj):
        status, _ = self._get_status_data(obj)
        return status

    def get_missing_count(self, obj):
        _, missing = self._get_status_data(obj)
        return missing

    def get_items(self, obj):
        # ✅ Build templates dict once per check, pass to item serializer
        templates = {
            t.item_id: t.required_quantity
            for t in obj.ambulance.templates.all()
        }
        items = obj.items.all()
        return CheckItemSerializer(
            items,
            many=True,
            context={"templates": templates}
        ).data