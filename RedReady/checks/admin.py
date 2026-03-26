from django.contrib import admin
from .models import AmbulanceCheck, CheckItem

admin.site.register(AmbulanceCheck)
admin.site.register(CheckItem)