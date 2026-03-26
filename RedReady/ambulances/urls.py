from django.urls import path
from .views import get_ambulances

urlpatterns = [
    path("", get_ambulances),
]