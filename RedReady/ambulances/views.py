from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Ambulance, AmbulanceItemTemplate
from .serializers import AmbulanceSerializer
from items.models import Item
from checks.models import AmbulanceCheck

from datetime import date
from checks.utils import get_shift, calculate_status


DEFAULT_ITEMS = [
    {"name": "AED",    "required_quantity": 1},
    {"name": "O2",     "required_quantity": 4},
    {"name": "SCOOP",  "required_quantity": 2},
    {"name": "Gloves", "required_quantity": 1},
    {"name": "Masks",  "required_quantity": 1},
    {"name": "Ambu",   "required_quantity": 2},
    {"name": "OPA",    "required_quantity": 8},
]


@api_view(["GET", "POST"])
def get_ambulances(request):

    if request.method == "GET":
        ambulances = Ambulance.objects.prefetch_related("templates__item").all()

        shift, shift_date = get_shift()

        all_checks = (
            AmbulanceCheck.objects
            .filter(shift=shift, date=shift_date)
            .prefetch_related("items__item", "items__connected_check__ambulance__templates")
            .select_related("user", "ambulance")
            .order_by("-time")
        )

        latest_check_by_ambulance = {}
        for check in all_checks:
            if check.ambulance_id not in latest_check_by_ambulance:
                latest_check_by_ambulance[check.ambulance_id] = check

        data = []

        for amb in ambulances:
            templates = {
                t.item_id: t.required_quantity
                for t in amb.templates.all()
            }

            last_check = latest_check_by_ambulance.get(amb.id)
            last_check_data = None
            missing_count = 0

            if last_check:
                last_check_data = {
                    "user": last_check.user.email,
                    "user_full_name": last_check.user.get_full_name(),
                    "date": last_check.date,
                    "time": last_check.time,
                    "shift": last_check.shift,
                    "items": [
                        {
                            "item": item.item.name,
                            "item_id": item.item.id,
                            "quantity": item.available_quantity,
                            "required": templates.get(item.item_id, 0),
                            "flagged": item.is_flagged,
                            "note": item.note,
                            "is_checked": item.is_checked,
                        }
                        for item in last_check.items.all()
                    ]
                }

                status, missing_count = calculate_status(last_check)
                last_checked = f"{last_check.date} {last_check.time}"

            else:
                status = "unchecked"
                last_checked = None

            data.append({
                "id": amb.id,
                "code": amb.code,
                "status": status,
                "last_checked": last_checked,
                "last_check": last_check_data,
                "missing_count": missing_count,
                "templates": [
                    {
                        "id": t.id,
                        "item": t.item.id,
                        "item_name": t.item.name,
                        "required_quantity": t.required_quantity,
                    }
                    for t in amb.templates.all()
                ]
            })

        return Response(data)

    elif request.method == "POST":
        code = request.data.get("code")

        if not code:
            return Response({"error": "Code is required"}, status=400)

        if Ambulance.objects.filter(code=code).exists():
            return Response({"error": "Ambulance already exists"}, status=400)

        amb = Ambulance.objects.create(code=code)

        for default in DEFAULT_ITEMS:
            item, _ = Item.objects.get_or_create(name=default["name"])
            AmbulanceItemTemplate.objects.create(
                ambulance=amb,
                item=item,
                required_quantity=default["required_quantity"]
            )

        return Response({
            "id": amb.id,
            "code": amb.code
        })