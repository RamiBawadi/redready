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
    missing_count = 0

    if not items.exists():
        return "unchecked", missing_count

    # ✅ Load ALL templates for this ambulance in ONE query
    templates = {
        t.item_id: t.required_quantity
        for t in ambulance.templates.all()
    }

    has_flag = False
    has_missing = False
    all_checked = True

    for item in items:
        if not item.is_checked:
            all_checked = False

        if item.is_flagged:
            has_flag = True

        # ✅ Dictionary lookup instead of DB query
        required_qty = templates.get(item.item_id, 0)

        if item.is_checked and item.available_quantity < required_qty:
            has_missing = True
            missing_count += 1

    if not all_checked:
        return "partial", missing_count

    if has_flag:
        return "critical", missing_count

    if has_missing:
        return "partial", missing_count

    return "ready", missing_count