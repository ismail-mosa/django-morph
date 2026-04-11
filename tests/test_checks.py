from django.test import TestCase, override_settings


class MiddlewareOrderingCheckTest(TestCase):
    @override_settings(
        MIDDLEWARE=[
            "django_morph.middleware.MorphMiddleware",
            "django.contrib.sessions.middleware.SessionMiddleware",
            "django.middleware.common.CommonMiddleware",
            "django.contrib.messages.middleware.MessageMiddleware",
        ]
    )
    def test_correct_ordering_no_warnings(self):
        from django.core import checks

        from django_morph.checks import check_middleware_ordering

        errors = check_middleware_ordering(None)
        self.assertEqual(len(errors), 0)

    @override_settings(
        MIDDLEWARE=[
            "django.contrib.sessions.middleware.SessionMiddleware",
            "django_morph.middleware.MorphMiddleware",
            "django.contrib.messages.middleware.MessageMiddleware",
        ]
    )
    def test_morph_after_session_warns(self):
        from django_morph.checks import check_middleware_ordering

        errors = check_middleware_ordering(None)
        warnings = [e for e in errors if e.id == "django_morph.W001"]
        self.assertTrue(len(warnings) > 0)

    @override_settings(
        MIDDLEWARE=[
            "django.contrib.sessions.middleware.SessionMiddleware",
            "django.contrib.messages.middleware.MessageMiddleware",
            "django_morph.middleware.MorphMiddleware",
        ]
    )
    def test_morph_after_both_warns_twice(self):
        from django_morph.checks import check_middleware_ordering

        errors = check_middleware_ordering(None)
        warnings = [e for e in errors if e.id == "django_morph.W001"]
        self.assertEqual(len(warnings), 2)

    @override_settings(MIDDLEWARE=[])
    def test_morph_missing_errors(self):
        from django_morph.checks import check_middleware_ordering

        errors = check_middleware_ordering(None)
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0].id, "django_morph.E001")
