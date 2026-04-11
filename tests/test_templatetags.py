from django.test import TestCase, override_settings


class MorphJsTagTest(TestCase):
    def test_morph_js_renders_scripts(self):
        from django_morph.templatetags.morph_tags import morph_js

        result = morph_js()
        self.assertIn("idiomorph.js", result)
        self.assertIn("morph-client", result)
        self.assertIn("data-morph-static", result)
        self.assertIn("morph-loading", result)

    @override_settings(DEBUG=False)
    def test_morph_js_uses_minified_in_production(self):
        from django_morph.templatetags.morph_tags import morph_js

        result = morph_js()
        self.assertIn("morph-client.min.js", result)

    @override_settings(DEBUG=True)
    def test_morph_js_uses_full_in_debug(self):
        from django_morph.templatetags.morph_tags import morph_js

        result = morph_js()
        self.assertNotIn("morph-client.min.js", result)
        self.assertIn("morph-client.js", result)

    def test_morph_js_uses_static_tag(self):
        from django_morph.templatetags.morph_tags import morph_js

        result = morph_js()
        self.assertIn("/static/", result)

    def test_morph_permanent_renders_attribute(self):
        from django_morph.templatetags.morph_tags import morph_permanent

        result = morph_permanent()
        self.assertIn("data-morph-preserve", result)
        self.assertIn("true", result)
