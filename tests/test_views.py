from django.test import TestCase


class PageRenderingTest(TestCase):
    def test_home_page(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "django-morph")

    def test_about_page(self):
        response = self.client.get("/about/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "idiomorph")

    def test_contact_page(self):
        response = self.client.get("/contact/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "form")

    def test_items_page(self):
        response = self.client.get("/items/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Add New Item")

    def test_items_modal(self):
        response = self.client.get("/items/?add=1")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "modal-backdrop")

    def test_charts_page(self):
        response = self.client.get("/charts/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "chart-bar")
        self.assertContains(response, "chart-line")
        self.assertContains(response, "chart-donut")

    def test_long_page(self):
        response = self.client.get("/long/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Section 1")

    def test_anchors_page(self):
        response = self.client.get("/anchors/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "section-alpha")
        self.assertContains(response, "section-beta")
        self.assertContains(response, "section-gamma")

    def test_widgets_page(self):
        response = self.client.get("/widgets/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "test-canvas")
        self.assertContains(response, "test-dialog")
        self.assertContains(response, "data-morph-preserve-children")

    def test_favicon(self):
        response = self.client.get("/favicon.ico")
        self.assertEqual(response.status_code, 200)


class ContactFormTest(TestCase):
    def test_contact_submit_redirect(self):
        response = self.client.post(
            "/contact/submit/",
            {"name": "Alice", "email": "a@b.com", "message": "hi"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("/success/", response.headers["Location"])

    def test_contact_submit_morph(self):
        response = self.client.post(
            "/contact/submit/",
            {"name": "Alice", "email": "a@b.com", "message": "hi"},
            HTTP_X_DJANGO_MORPH="true",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Morph-Redirect", response.headers)

    def test_success_page(self):
        response = self.client.get("/success/?name=Alice")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Alice")


class ItemCRUDTest(TestCase):
    def test_create_item(self):
        response = self.client.post(
            "/items/add/",
            {"title": "Test Item", "description": "A test"},
        )
        self.assertEqual(response.status_code, 302)

        from testproject.testapp.models import Item

        self.assertEqual(Item.objects.count(), 1)
        self.assertEqual(Item.objects.first().title, "Test Item")

    def test_create_item_empty_title(self):
        response = self.client.post(
            "/items/add/",
            {"title": "", "description": "A test"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("add=1", response.headers["Location"])

        from testproject.testapp.models import Item

        self.assertEqual(Item.objects.count(), 0)

    def test_create_item_morph_redirect(self):
        response = self.client.post(
            "/items/add/",
            {"title": "Morph Item", "description": "via morph"},
            HTTP_X_DJANGO_MORPH="true",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["X-Morph-Redirect"], "/items/")


class MorphHeaderTest(TestCase):
    def test_vary_header_on_normal_request(self):
        response = self.client.get("/")
        self.assertIn("X-Django-Morph", response.headers.get("Vary", ""))

    def test_vary_header_on_morph_request(self):
        response = self.client.get("/", HTTP_X_DJANGO_MORPH="true")
        self.assertIn("X-Django-Morph", response.headers.get("Vary", ""))

    def test_error_page(self):
        response = self.client.get("/error/")
        self.assertEqual(response.status_code, 500)
