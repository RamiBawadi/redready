from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", views.me),
    path("users/create/", views.create_user),
    path("users/list/", views.list_users),
    path("users/delete/<int:id>/", views.delete_user),
]