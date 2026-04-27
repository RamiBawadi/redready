from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("checks", "0002_checkitem_is_checked"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ambulancecheck",
            name="date",
            field=models.DateField(),
        ),
    ]
