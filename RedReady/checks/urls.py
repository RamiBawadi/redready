from django.urls import path
from .views import create_check, get_checks

urlpatterns = [
    path("", create_check),
    path("<int:ambulance_id>", get_checks),
]