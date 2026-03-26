from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Ambulance
from .serializers import AmbulanceSerializer


from checks.utils import calculate_status

@api_view(["GET"])
def get_ambulances(request):
    ambulances = Ambulance.objects.all()

    data = []

    for amb in ambulances:
        last_check = amb.checks.order_by("-date", "-time").first()

        if not last_check:
            status = "unchecked"
            last_checked = None
        else:
            status = calculate_status(last_check)
            last_checked = f"{last_check.date} {last_check.time}"

        data.append({
            "id": amb.id,
            "code": amb.code,
            "status": status,
            "last_checked": last_checked,
            "templates": [
                {
                    "item": t.item.id,
                    "item_name": t.item.name,
                    "required_quantity": t.required_quantity,
                }
                for t in amb.templates.all()
            ]
        })

    return Response(data)