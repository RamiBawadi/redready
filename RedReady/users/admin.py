from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    # Show in list view
    list_display = ("email", "first_name", "last_name", "role", "is_staff", "is_superuser")
    ordering = ("email",)

    # Fields when editing user
    fieldsets = (
        (None, {"fields": ("email", "password")}),

        ("Personal Info", {
            "fields": ("first_name", "last_name")
        }),

        ("Permissions", {
            "fields": ("role", "is_staff", "is_superuser")
        }),
    )

    # Fields when creating user
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "first_name",
                "last_name",
                "password1",
                "password2",
                "role",
                "is_staff",
                "is_superuser",
            ),
        }),
    )

    search_fields = ("email", "first_name", "last_name")