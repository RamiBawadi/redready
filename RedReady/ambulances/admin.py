from django.contrib import admin
from .models import Ambulance, AmbulanceItemTemplate

admin.site.register(Ambulance)
admin.site.register(AmbulanceItemTemplate)