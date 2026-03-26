from django.db import models

# Create your models here.
class Ambulance(models.Model):
    code  = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code}"
    
from items.models import Item

class AmbulanceItemTemplate(models.Model):
    ambulance = models.ForeignKey(Ambulance, on_delete=models.CASCADE, related_name="templates")
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    required_quantity = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.ambulance} - {self.item}"