from django.test import TestCase, RequestFactory, override_settings
from django.http import HttpResponse, HttpResponseRedirect


class MorphMiddlewareTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def _get_middleware(self):
        from django_morph.middleware import MorphMiddleware

        def get_response(request):
            return HttpResponse("ok")

        return MorphMiddleware(get_response)

    def test_non_morph_request_passes_through(self):
        middleware = self._get_middleware()
        request = self.factory.get("/")
        response = middleware(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Django-Morph", response.get("Vary", ""))

    def test_morph_request_adds_vary_header(self):
        middleware = self._get_middleware()
        request = self.factory.get("/", HTTP_X_DJANGO_MORPH="true")
        response = middleware(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Django-Morph", response.get("Vary", ""))

    def test_morph_request_converts_redirect(self):
        def get_response(request):
            return HttpResponseRedirect("/target/")

        from django_morph.middleware import MorphMiddleware

        middleware = MorphMiddleware(get_response)
        request = self.factory.get("/", HTTP_X_DJANGO_MORPH="true")
        response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Morph-Redirect"), "/target/")
        self.assertNotIn("Location", response.headers)

    def test_non_morph_redirect_passes_through(self):
        def get_response(request):
            return HttpResponseRedirect("/target/")

        from django_morph.middleware import MorphMiddleware

        middleware = MorphMiddleware(get_response)
        request = self.factory.get("/")
        response = middleware(request)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers.get("Location"), "/target/")
        self.assertNotIn("X-Morph-Redirect", response.headers)

    def test_morph_301_redirect_converted(self):
        def get_response(request):
            return HttpResponse(status=301, headers={"Location": "/new/"})

        from django_morph.middleware import MorphMiddleware

        middleware = MorphMiddleware(get_response)
        request = self.factory.get("/", HTTP_X_DJANGO_MORPH="true")
        response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Morph-Redirect"), "/new/")

    def test_vary_header_appended_to_existing(self):
        def get_response(request):
            resp = HttpResponse("ok")
            resp.headers["Vary"] = "Cookie"
            return resp

        from django_morph.middleware import MorphMiddleware

        middleware = MorphMiddleware(get_response)
        request = self.factory.get("/")
        response = middleware(request)

        self.assertIn("Cookie", response.headers["Vary"])
        self.assertIn("X-Django-Morph", response.headers["Vary"])

    def test_vary_header_not_duplicated(self):
        def get_response(request):
            resp = HttpResponse("ok")
            resp.headers["Vary"] = "X-Django-Morph"
            return resp

        from django_morph.middleware import MorphMiddleware

        middleware = MorphMiddleware(get_response)
        request = self.factory.get("/")
        response = middleware(request)

        self.assertEqual(response.headers["Vary"], "X-Django-Morph")
