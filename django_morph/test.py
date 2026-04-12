from django.test import TestCase, Client


class MorphClient(Client):
    def __init__(
        self, enforce_csrf_checks=False, raise_request_exception=True, **defaults
    ):
        super().__init__(enforce_csrf_checks, raise_request_exception, **defaults)
        self.defaults["HTTP_X_DJANGO_MORPH"] = "true"


class MorphTestCase(TestCase):
    client_class = MorphClient

    def assertMorphRedirect(self, response, expected_url):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Morph-Redirect"), expected_url)

    def assertMorphVary(self, response):
        vary = response.headers.get("Vary", "")
        vary_parts = [v.strip() for v in vary.split(",")]
        self.assertIn("X-Django-Morph", vary_parts)

    def assertMorphOK(self, response):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Morph-Redirect"), None)
