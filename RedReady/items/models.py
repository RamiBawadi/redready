from django.db import models

class Item(models.Model):
    name = models.CharField(max_length=100)
    is_numeric = models.BooleanField(default=False)

    def __str__(self):
        return self.name
