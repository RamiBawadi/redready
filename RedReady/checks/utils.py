from datetime import datetime, time
from django.utils import timezone


def get_shift():
    now = timezone.localtime().time()


    if time(5, 0) <= now < time(17, 0):
        return "day"
    return "night"


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
        return "unchecked"

    if has_flag:
        return "critical"

    if has_missing:
        return "partial"

    return "ready"