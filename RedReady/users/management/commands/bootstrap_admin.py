import os

from django.core.management.base import BaseCommand

from users.models import User


class Command(BaseCommand):
    help = "Create or update an initial admin user from environment variables."

    def handle(self, *args, **options):
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")
        first_name = os.environ.get("ADMIN_FIRST_NAME", "Admin")
        last_name = os.environ.get("ADMIN_LAST_NAME", "User")

        if not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Skipping admin bootstrap because ADMIN_EMAIL or ADMIN_PASSWORD is missing."
                )
            )
            return

        user, created = User.objects.get_or_create(
            email=User.objects.normalize_email(email),
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )

        user.first_name = first_name
        user.last_name = last_name
        user.role = "admin"
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} admin user {user.email}."))
