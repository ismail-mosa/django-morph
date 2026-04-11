from django.conf import settings
from django.core.checks import Error, Warning, register


@register()
def check_middleware_ordering(app_configs, **kwargs):
    errors = []
    middleware = getattr(settings, "MIDDLEWARE", [])

    morph = "django_morph.middleware.MorphMiddleware"
    session = "django.contrib.sessions.middleware.SessionMiddleware"
    messages = "django.contrib.messages.middleware.MessageMiddleware"

    if morph not in middleware:
        errors.append(
            Error(
                "MorphMiddleware is not in MIDDLEWARE.",
                hint="Add 'django_morph.middleware.MorphMiddleware' to your MIDDLEWARE setting.",
                id="django_morph.E001",
            )
        )
        return errors

    morph_index = middleware.index(morph)

    for mw_name, mw_label in [
        (session, "SessionMiddleware"),
        (messages, "MessageMiddleware"),
    ]:
        if mw_name in middleware:
            mw_index = middleware.index(mw_name)
            if morph_index > mw_index:
                errors.append(
                    Warning(
                        f"MorphMiddleware is positioned after {mw_label}.",
                        hint=(
                            f"Move 'django_morph.middleware.MorphMiddleware' above "
                            f"'{mw_name}' in MIDDLEWARE to ensure sessions and "
                            f"messages work correctly with morph requests."
                        ),
                        id="django_morph.W001",
                    )
                )

    return errors
