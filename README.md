# django-morph

Transform any Django application into a seamless SPA-like experience using [Idiomorph](https://github.com/bigskysoftware/idiomorph) for DOM patching. Zero manual HTML attributes required — add the middleware and one template tag, and your entire site navigates without full page reloads.

## Installation

```bash
pip install django-morph
```

## Quickstart

**1. Add to `INSTALLED_APPS`:**

```python
INSTALLED_APPS = [
    ...
    "django_morph",
]
```

**2. Add the middleware (before `SessionMiddleware` and `MessageMiddleware`):**

```python
MIDDLEWARE = [
    "django_morph.middleware.MorphMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    ...
]
```

**3. Add the template tag to your base template:**

```html
{% load morph_tags %}
<!DOCTYPE html>
<html>
<head>
    {% morph_js %}
</head>
<body>
    <nav>
        <a href="/">Home</a>
        <a href="/about/">About</a>
    </nav>

    {% block content %}{% endblock %}
</body>
</html>
```

That's it. All local `<a>` clicks and `<form>` submissions are now intercepted and morphed. No full page reloads.

## Full Documentation

See [DOCS.md](DOCS.md) for:

- How it works (fetch → morph → history pipeline)
- All template tags and HTML attributes
- Common patterns (forms, redirects, JS libraries, partial responses, infinite scroll)
- Events API
- Script loading behavior
- Auto-preserved elements
- Known issues and limitations

## License

MIT
