from django.db import models
from ambulances.models import Ambulance
from items.models import Item
from users.models import User

# Create your models here.
class AmbulanceCheck(models.Model):
    SHIFT_CHOICES = [
        ("day", "Day"),
        ("night", "Night"),
    ]

    ambulance = models.ForeignKey(Ambulance, on_delete=models.CASCADE, related_name="checks")
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    shift = models.CharField(max_length=10, choices=SHIFT_CHOICES)

    date = models.DateField(auto_now_add=True)
    time = models.TimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ambulance} - {self.date} ({self.shift})"
    

class CheckItem(models.Model):
    connected_check = models.ForeignKey(AmbulanceCheck, on_delete=models.CASCADE, related_name="items")

    item = models.ForeignKey(Item, on_delete=models.CASCADE)

    available_quantity = models.IntegerField(default=0)

    value = models.IntegerField(null=True, blank=True)  # for O2 etc

    is_checked = models.BooleanField(default=False)
    is_flagged = models.BooleanField(default=False)
    note = models.TextField(blank=True)

    def __str__(self):
        return f"{self.item} ({self.available_quantity})"