from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AmbulanceCheck, CheckItem
from .services import create_check_items
from .serializers import AmbulanceCheckSerializer
from .utils import get_shift


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
            is_checked=True
        )

    return Response({"message": "Check saved"})


@api_view(["GET"])
def get_checks(request, ambulance_id):
    checks = AmbulanceCheck.objects.filter(
        ambulance_id=ambulance_id
    ).prefetch_related("items__item")

    serializer = AmbulanceCheckSerializer(checks, many=True)
    return Response(serializer.data)