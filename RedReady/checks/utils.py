from datetime import datetime, time, timedelta
from django.utils import timezone

from django.utils import timezone
from datetime import timedelta

def get_shift():
    now = timezone.localtime()  

    if 5 <= now.hour < 17:
        return "day", now.date()
    else:
        if now.hour < 5:
            return "night", (now - timedelta(days=1)).date()
        else:
            return "night", now.date()

def calculate_status(check):
    items = check.items.all()
    ambulance = check.ambulance
    
    if not items.exists():
        return "unchecked"

    has_flag = False
    has_missing = False
    all_checked = True

    for item in items:
        if not item.is_checked:
            all_checked = False

        if item.is_flagged:
            has_flag = True

        template = ambulance.templates.filter(item=item.item).first()
        required_qty = template.required_quantity if template else 0

        if item.is_checked and item.available_quantity < required_qty:
            has_missing = True

    if not all_checked:
        return "partial"

    if has_flag:
        return "critical"

    if has_missing:
        return "partial"

    return "ready"