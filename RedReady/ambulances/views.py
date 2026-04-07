from rest_framework import request
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Ambulance
from .serializers import AmbulanceSerializer

from datetime import date
from checks.utils import get_shift
from checks.utils import calculate_status

@api_view(["GET", "POST"])
def get_ambulances(request):

    if request.method == "GET":
        ambulances = Ambulance.objects.all()
        today = date.today()
        shift, shift_date = get_shift()
        missing_count = 0
        
        data = []

        for amb in ambulances:
            last_check = amb.checks.filter(shift=shift,date=shift_date).order_by("-time").first()
            last_check_data = None

            
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
                            "required": (
                amb.templates.filter(item=item.item).first().required_quantity
                if amb.templates.filter(item=item.item).first()
                else 0
            ),
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

        return Response({
            "id": amb.id,
            "code": amb.code
        })

       
