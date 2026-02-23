from django.db import models

# Create your models here.
class Ambulance(models.Model):
    ambulanceCode = models.CharField(max_length=20, unique=True)
    center = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.ambulanceCode}"