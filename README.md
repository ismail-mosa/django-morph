# django-morph

**Zero-config SPA-like navigation for Django.** Add middleware + one template tag, and your entire site navigates without full page reloads. Uses [Idiomorph](https://github.com/bigskysoftware/idiomorph) for DOM patching — no JavaScript to write, no per-element markup, no build step.

[![CI](https://github.com/ismail-mosa/django-morph/actions/workflows/ci.yml/badge.svg)](https://github.com/ismail-mosa/django-morph/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/pypi/v/django-morph.svg)](https://pypi.org/project/django-morph/)
[![Python](https://img.shields.io/pypi/pyversions/django-morph.svg)](https://pypi.org/project/django-morph/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why django-morph?

You have a Django project with standard views returning HTML. You want it to feel fast and modern — no full page reloads, instant navigation, smooth transitions — but you don't want to:

- Rewrite your frontend in React/Vue
- Add `hx-get` / `hx-post` / `hx-target` to every element (HTMX)
- Build a separate REST API + SPA
- Change a single line of your Django views

django-morph intercepts all `<a>` clicks and `<form>` submissions globally, fetches the page via AJAX, diffs the DOM with Idiomorph, and patches only what changed. Django redirects, CSRF tokens, and the messages framework all work seamlessly.

## Features

- **Zero config** — middleware + one `{% morph_js %}` tag, done
- **Global interception** — all links and forms handled automatically, no per-element attributes
- **Django-native** — `redirect()`, `messages`, CSRF, and `@login_required` just work
- **Partial morph targets** — `data-morph-target` to update only a specific element
- **Element preservation** — audio/video keep playing, canvas keeps its drawing, file inputs keep their selection
- **View Transitions** — cross-fade animations on navigation (Chrome 111+, Safari 18+)
- **Link prefetching** — hovered links are prefetched for instant navigation
- **Script management** — external libraries load once, init code re-runs after morph
- **Scroll restoration** — back/forward restores scroll position correctly
- **Error handling** — 4xx/5xx pages morph inline instead of hard reload
- **Short `dm-*` attributes** — `dm-target` instead of `data-morph-target`
- **Programmatic API** — `DjangoMorph.navigate()` and `DjangoMorph.refresh()`
- **Test helpers** — `MorphTestCase` and `MorphClient` for Django tests
- **Python 3.8–3.12** and **Django 3.2–5.0** supported

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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}My Site{% endblock %}</title>
    {% morph_js %}
</head>
<body>
    <nav>
        <a href="/">Home</a>
        <a href="/about/">About</a>
        <a href="/contact/">Contact</a>
    </nav>

    {% block content %}{% endblock %}
</body>
</html>
```

That's it. All local `<a>` clicks and `<form>` submissions are now intercepted and morphed. No full page reloads.

> **Tip:** All `data-morph-*` attributes have a shorter `dm-*` alias — e.g. `dm-target="#results"` instead of `data-morph-target="#results"`.

## Opting Out

Force a full page reload for specific links or forms:

```html
<a href="/download/" dm="false">Download PDF</a>
```

## Preserving Elements

Keep an element alive across navigations (audio keeps playing, canvas keeps its drawing):

```html
<div id="player" data-morph-preserve>
    <audio controls src="/music.mp3"></audio>
</div>
```

These elements are **automatically** preserved (no attribute needed): `<canvas>`, `<video>`, `<audio>`, `<iframe>`, `<input type="file">`, `<input type="password">`, `[contenteditable="true"]`, `<dialog open>`.

## Partial Morph Targets

Update only a specific element instead of the entire page:

```html
<form method="get" dm-target="#search-results">
    <input name="q" placeholder="Search...">
</form>

<div id="search-results">
    <!-- Only this element updates -->
</div>
```

## Full Documentation

See [DOCS.md](DOCS.md) for:

- How it works (fetch → morph → history pipeline)
- All HTML attributes (`dm-target`, `dm-swap`, `dm-push`, `dm-static`, `dm-preserve-children`)
- Common patterns (forms, redirects, JS libraries, infinite scroll, multi-step wizards)
- Events API (`django-morph:updated`, `django-morph:fetch-start`, `django-morph:error`)
- Script loading behavior and execution order
- Auto-preserved elements
- Programmatic API (`DjangoMorph.navigate()`, `DjangoMorph.refresh()`)
- Testing with `MorphTestCase`
- django-morph vs HTMX comparison and migration path

## Demo

A full-featured demo app is included in the `demo/` directory:

```bash
cd demo
python manage.py migrate
python manage.py seed_tasks
python manage.py runserver
```

Then visit `http://127.0.0.1:8000/home/` for a guided feature tour, or `http://127.0.0.1:8000/` for the task management CRUD.

## Requirements

- Python 3.8+
- Django 3.2+
- A modern browser (Chrome, Firefox, Safari, Edge)

## License

MIT
