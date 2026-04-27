from datetime import date
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from ambulances.models import Ambulance, AmbulanceItemTemplate
from items.models import Item
from users.models import User

from .models import AmbulanceCheck
from .utils import calculate_status


@override_settings(
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
    SECURE_SSL_REDIRECT=False,
)
class CheckFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="volunteer@example.com",
            password="testpass123",
            role="volunteer",
            first_name="Test",
            last_name="Volunteer",
        )
        self.client.force_authenticate(self.user)

        self.ambulance = Ambulance.objects.create(code="692")
        self.item_a = Item.objects.create(name="AED")
        self.item_b = Item.objects.create(name="O2")

        AmbulanceItemTemplate.objects.create(
            ambulance=self.ambulance,
            item=self.item_a,
            required_quantity=1,
        )
        AmbulanceItemTemplate.objects.create(
            ambulance=self.ambulance,
            item=self.item_b,
            required_quantity=2,
        )

    @patch("checks.views.get_shift", return_value=("day", date(2026, 4, 28)))
    def test_partial_check_stays_partial(self, _mock_shift):
        response = self.client.post(
            "/api/checks/",
            {
                "ambulance": self.ambulance.id,
                "items": [
                    {
                        "item": self.item_a.id,
                        "available_quantity": 1,
                        "is_checked": True,
                    },
                    {
                        "item": self.item_b.id,
                        "available_quantity": 0,
                        "is_checked": False,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        check = AmbulanceCheck.objects.get()
        saved_items = {item.item_id: item for item in check.items.all()}

        self.assertTrue(saved_items[self.item_a.id].is_checked)
        self.assertFalse(saved_items[self.item_b.id].is_checked)

        status, missing_count = calculate_status(check)
        self.assertEqual(status, "partial")
        self.assertEqual(missing_count, 0)

    @patch("checks.views.get_shift", return_value=("night", date(2026, 4, 27)))
    def test_check_uses_shift_date_instead_of_calendar_date(self, _mock_shift):
        response = self.client.post(
            "/api/checks/",
            {
                "ambulance": self.ambulance.id,
                "items": [
                    {
                        "item": self.item_a.id,
                        "available_quantity": 1,
                        "is_checked": True,
                    },
                    {
                        "item": self.item_b.id,
                        "available_quantity": 2,
                        "is_checked": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        check = AmbulanceCheck.objects.get()
        self.assertEqual(check.shift, "night")
        self.assertEqual(check.date, date(2026, 4, 27))

    def test_ambulance_list_includes_templates_when_no_check_exists(self):
        response = self.client.get("/api/ambulances/")

        self.assertEqual(response.status_code, 200)

        ambulance_data = next(
            item for item in response.json() if item["id"] == self.ambulance.id
        )

        self.assertEqual(ambulance_data["status"], "unchecked")
        self.assertIsNone(ambulance_data["last_check"])
        self.assertEqual(len(ambulance_data["templates"]), 2)
