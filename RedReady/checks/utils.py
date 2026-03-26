from datetime import datetime, time, timedelta
from django.utils import timezone

from datetime import datetime, timedelta

def get_shift():
    now = datetime.now() 

    if 5 <= now.hour < 17:
        return "day", now.date()
    else:
        # night shift
        if now.hour < 5:
            return "night", (now - timedelta(days=1)).date()
        return "night", now.date()


def calculate_status(check):
    items = check.items.all()

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

        if item.is_checked and item.available_quantity == 0:
            has_missing = True

    if not all_checked:
        return "partial"

    if has_flag:
        return "critical"

    if has_missing:
        return "partial"

    return "ready"