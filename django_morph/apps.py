from django.apps import AppConfig


class MorphConfig(AppConfig):
    name = "django_morph"
    verbose_name = "Django Morph"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        from django_morph import checks  # noqa: F401
