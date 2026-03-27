from django.urls import path
from .views import create_check, get_checks, create_template, update_template, delete_template

urlpatterns = [
    path("checks/", create_check),
    path("checks/<int:ambulance_id>/", get_checks),

    path("templates/", create_template),
    path("templates/<int:id>/", update_template),
    path("templates/<int:id>/", delete_template),
]
