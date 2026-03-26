from ambulances.models import AmbulanceItemTemplate
from .models import CheckItem

def create_check_items(check):
    templates = AmbulanceItemTemplate.objects.filter(ambulance=check.ambulance)

    for t in templates:
        CheckItem.objects.create(
            connected_check=check,
            item=t.item,
            available_quantity=0,
            is_checked=False
        )