from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AmbulanceCheck, CheckItem
from .services import create_check_items
from .serializers import AmbulanceCheckSerializer
from .utils import get_shift



from items.models import Item
from ambulances.models import AmbulanceItemTemplate

@api_view(["POST"])
@permission_classes([IsAuthenticated])

def create_check(request):
    ambulance_id = request.data.get("ambulance")
    shift, shift_date = get_shift()
    items_data = request.data.get("items", [])

    # create check
    check = AmbulanceCheck.objects.create(
        ambulance_id=ambulance_id,
        user=request.user,
        shift=shift,
        date=shift_date,
    )

    # create empty items first
    create_check_items(check)

    for item_data in items_data:
        CheckItem.objects.filter(
            connected_check=check,
            item_id=item_data["item"]
        ).update(
            available_quantity=item_data.get("available_quantity", 0),
            is_flagged=item_data.get("is_flagged", False),
            note=item_data.get("note", ""),
            is_checked=item_data.get("is_checked", False)
        )

    return Response({"message": "Check saved"})


@api_view(["GET"])
def get_checks(request, ambulance_id):
    checks = AmbulanceCheck.objects.filter(
        ambulance_id=ambulance_id
    ).prefetch_related(
        "items__item",
        "ambulance__templates"  # ✅ prefetch templates too
    ).select_related(
        "ambulance",             # ✅ fetch ambulance in same query
        "user"
    )

    serializer = AmbulanceCheckSerializer(checks, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_template(request):
    ambulance_id = request.data.get("ambulance")
    item_name = request.data.get("item_name")
    required = request.data.get("required_quantity")

    if not ambulance_id or not item_name:
        return Response({"error": "Missing data"}, status=400)

    required = int(required or 1)

    # create or get item
    item, _ = Item.objects.get_or_create(name=item_name)

    # prevent duplicate template
    exists = AmbulanceItemTemplate.objects.filter(
        ambulance_id=ambulance_id,
        item=item
    ).exists()

    if exists:
        return Response({"error": "Item already exists"}, status=400)

    template = AmbulanceItemTemplate.objects.create(
        ambulance_id=ambulance_id,
        item=item,
        required_quantity=required
    )

    return Response({
        "id": template.id,   # 🔥 IMPORTANT
        "item": item.name,
        "required_quantity": template.required_quantity
    })

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_template(request, id):
    try:
        template = AmbulanceItemTemplate.objects.get(id=id)
    except AmbulanceItemTemplate.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    required = request.data.get("required_quantity")

    if required is None:
        return Response({"error": "Missing required_quantity"}, status=400)

    template.required_quantity = int(required)
    template.save()

    return Response({
        "id": template.id,
        "required_quantity": template.required_quantity
    })

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_template(request, id):
    deleted, _ = AmbulanceItemTemplate.objects.filter(id=id).delete()

    if not deleted:
        return Response({"error": "Not found"}, status=404)

    return Response({"message": "deleted"})


