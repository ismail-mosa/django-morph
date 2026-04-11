# django-morph — Full Documentation

## Table of Contents

- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Template Tags](#template-tags)
- [HTML Attributes](#html-attributes)
- [Common Patterns](#common-patterns)
- [Events](#events)
- [Script Loading](#script-loading)
- [Auto-Preserved Elements](#auto-preserved-elements)
- [Middleware](#middleware)
- [System Checks](#system-checks)
- [Known Issues & Limitations](#known-issues--limitations)
- [Browser Support](#browser-support)

---

## Getting Started

### Install

```bash
pip install django-morph
```

### Configure

**`settings.py`** — Add the app and middleware:

```python
INSTALLED_APPS = [
    ...
    "django_morph",
]

MIDDLEWARE = [
    "django_morph.middleware.MorphMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    ...
]
```

> `MorphMiddleware` must come **before** `SessionMiddleware` and `MessageMiddleware`. Django-morph includes a system check that warns you if the ordering is wrong. Run `python manage.py check` to verify.

### Add to Your Template

**`base.html`:**

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

**`home.html`:**

```html
{% extends "base.html" %}

{% block title %}Home{% endblock %}

{% block content %}
<h1>Welcome</h1>
<p>Click any nav link — the page morphs without a full reload.</p>
{% endblock %}
```

That's all you need. Every local `<a>` click and `<form>` submit is now handled by django-morph.

---

## How It Works

1. **Client-side** (`morph-client.js`) intercepts clicks on local `<a>` tags and form submissions
2. Sends a `fetch()` request with the `X-Django-Morph: true` header
3. **Middleware** intercepts 301/302 redirects, converts them to `200` + `X-Morph-Redirect` header
4. Client uses **Idiomorph** to diff and patch the DOM — no full page reload
5. URL bar updates via `history.pushState`
6. Inline scripts re-execute; external scripts marked `data-morph-static` run only once
7. `django-morph:updated` event fires for third-party JS re-initialization

---

## Template Tags

### `{% morph_js %}`

Renders `<script>` tags for idiomorph.js and morph-client.js, plus inline CSS for the loading progress bar. Place it in your base template's `<head>`.

```html
{% load morph_tags %}
<head>
    {% morph_js %}
</head>
```

In production (`DEBUG=False`), the minified `morph-client.min.js` is served automatically.

### `{% morph_permanent %}`

Adds `data-morph-preserve="true"` to an element, preventing it from being modified during morph. Useful for audio/video players, live widgets, or any stateful element.

> The element **must** have a unique `id` attribute.

```html
<div id="audio-player" {% morph_permanent %}>
    <audio controls src="/music.mp3"></audio>
</div>
```

---

## HTML Attributes

### `data-morph-preserve`

Prevents an element from being morphed, removed, or duplicated during navigation. The element persists exactly as-is. Requires a unique `id`.

```html
<div id="live-clock" data-morph-preserve="true">
    <!-- Survives all navigations -->
</div>
```

### `data-morph="false"`

Opts out of morph behavior for a specific link or form. Forces a full page reload.

```html
<a href="/download/" data-morph="false">Download PDF</a>

<form action="/payment/" method="post" data-morph="false">
    {% csrf_token %}
    <button type="submit">Pay (full reload)</button>
</form>
```

### `data-morph-static`

Prevents a `<script>` from being re-executed after morph. Use this for library scripts (Bootstrap, Alpine.js, Chart.js, etc.) that should only load once.

```html
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" data-morph-static></script>
<script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer data-morph-static></script>
```

### `data-morph-preserve-children`

Prevents **all children** inside the element from being morphed, removed, or added. Useful for third-party widgets (Stripe, Google Maps, reCAPTCHA) that create complex internal DOM structures.

```html
<div id="stripe-card-element" data-morph-preserve-children>
    <!-- Stripe.js creates internal iframes here — all preserved -->
</div>
```

Unlike `data-morph-preserve`, this does not require children to have `id` attributes.

---

## Common Patterns

### Persistent Audio/Video Player

Keep media playing across page navigations:

```html
<div id="music-player" data-morph-preserve="true">
    <audio controls>
        <source src="/song.mp3" type="audio/mpeg">
    </audio>
</div>
```

Place this in your base template. The player continues playing when users navigate between pages.

### Forms with Redirects & Django Messages

Django's `redirect()` and the messages framework work seamlessly:

```python
# views.py
def contact(request):
    if request.method == "POST":
        form = ContactForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Message sent!")
            return redirect("contact_success")
        messages.error(request, "Please fix the errors.")
    return render(request, "contact.html", {"form": form})
```

```html
<!-- base.html — messages display -->
{% if messages %}
<ul class="messages">
    {% for message in messages %}
    <li class="{{ message.tags }}">{{ message }}</li>
    {% endfor %}
</ul>
{% endif %}
```

The middleware converts the 302 redirect into a morph-compatible response. The URL bar updates and messages display without a full reload.

### Using with Bootstrap

```html
{% load morph_tags %}
<!DOCTYPE html>
<html>
<head>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" data-morph-static>
    {% morph_js %}
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="/">My App</a>
            <div class="collapse navbar-collapse">
                <ul class="navbar-nav">
                    <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="/dashboard/">Dashboard</a></li>
                </ul>
            </div>
        </div>
    </nav>

    {% block content %}{% endblock %}

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" data-morph-static></script>
</body>
</html>
```

Bootstrap components (tabs, modals, toasts) re-initialize after morph because inline scripts re-run. Mark the CDN `<script>` tags with `data-morph-static` so they only load once.

### Using with Tailwind CSS + Alpine.js

```html
{% load morph_tags %}
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com" data-morph-static></script>
    <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer data-morph-static></script>
    {% morph_js %}
</head>
<body class="bg-gray-50">
    <div x-data="{ open: false }">
        <button @click="open = !open" class="bg-blue-500 text-white px-4 py-2 rounded">Toggle</button>
        <div x-show="open" x-transition class="mt-4 p-4 bg-white rounded shadow">
            Alpine content here
        </div>
    </div>

    {% block content %}{% endblock %}
</body>
</html>
```

Alpine.js `x-data` re-initializes after each morph (state resets). This is expected — the inline scripts re-run.

### Using with Chart.js, Flatpickr, and Other Libraries

Mark library scripts with `data-morph-static`. Put your initialization code in an inline `<script>` — it will re-run after morph, re-initializing widgets with fresh DOM elements:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js" data-morph-static></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr" data-morph-static></script>

<script>
    var ctx = document.getElementById("my-chart");
    if (ctx) {
        new Chart(ctx, {
            type: "bar",
            data: { labels: ["A", "B", "C"], datasets: [{ data: [1, 2, 3] }] }
        });
    }

    flatpickr("#date-input", { dateFormat: "Y-m-d" });
</script>
```

External `data-morph-static` scripts load first, then inline scripts execute. This ensures `Chart` and `flatpickr` are available when the init code runs.

### Re-initializing Third-Party JS

For libraries that need explicit re-initialization (tooltips, lazy-loaded images, etc.), use the `django-morph:updated` event:

```html
<script>
    function initApp() {
        tippy("[data-tippy-content]");
        lozad().observe();
    }

    initApp();

    document.addEventListener("django-morph:updated", function () {
        initApp();
    });
</script>
```

### Partial HTML Responses

Return a fragment instead of a full page when the request comes from morph:

```python
# views.py
def item_list(request):
    items = Item.objects.all()

    if request.META.get("HTTP_X_DJANGO_MORPH") == "true":
        return render(request, "items/_list.html", {"items": items})

    return render(request, "items/list.html", {"items": items})
```

```html
<!-- items/list.html — full page -->
{% extends "base.html" %}
{% block content %}
<div id="item-list">
    {% include "items/_list.html" %}
</div>
{% endblock %}
```

```html
<!-- items/_list.html — partial fragment -->
{% for item in items %}
<div class="item">{{ item.name }}</div>
{% endfor %}
```

When morphed, the partial HTML replaces the `#item-list` content. For full-page navigation, the complete template renders.

### Infinite Scroll / Load More

Append new content without replacing the existing DOM:

```html
<div id="feed-list">
    {% for item in page_items %}
    <div class="feed-item">{{ item.text }}</div>
    {% endfor %}
</div>

<button id="load-more">Load More</button>

<script>
    var page = {{ page }};
    document.getElementById("load-more").addEventListener("click", function () {
        page++;
        fetch("/feed/?page=" + page, {
            headers: { "X-Django-Morph": "true" },
            credentials: "same-origin"
        })
        .then(function (r) { return r.text(); })
        .then(function (html) {
            document.getElementById("feed-list").insertAdjacentHTML("beforeend", html);
        });
    });
</script>
```

### Multi-Step Form Wizard

Build client-side wizard steps with JavaScript while using a single Django form:

```html
<form method="post" action="/submit/">
    {% csrf_token %}

    <div id="step-1">
        <h3>Step 1: Personal Info</h3>
        <input name="name" required placeholder="Full Name">
        <button type="button" onclick="showStep(2)">Next</button>
    </div>

    <div id="step-2" style="display:none;">
        <h3>Step 2: Details</h3>
        <input name="email" required placeholder="Email">
        <button type="button" onclick="showStep(1)">Back</button>
        <button type="submit">Submit</button>
    </div>
</form>

<script>
    function showStep(n) {
        document.querySelectorAll("[id^='step-']").forEach(function (el) {
            el.style.display = "none";
        });
        document.getElementById("step-" + n).style.display = "block";
    }
</script>
```

The form submits via morph, Django processes it, and the redirect/messages work normally.

### Opting Out

Force a full page reload for specific links or forms:

```html
<a href="/export/csv/" data-morph="false">Export CSV</a>

<form action="/stripe/webhook/" method="post" data-morph="false">
    {% csrf_token %}
    <button type="submit">Process Payment</button>
</form>
```

### File Upload Inputs

File inputs (`<input type="file">`) are automatically preserved during morph — the user's file selection won't be lost. No extra attributes needed, but the input must have an `id`:

```html
<form method="post" enctype="multipart/form-data" action="/upload/">
    {% csrf_token %}
    <input type="file" id="document-upload" name="document">
    <button type="submit">Upload</button>
</form>
```

---

## Events

### `django-morph:updated`

Fired after every successful DOM morph. Use it to re-initialize third-party JavaScript.

```js
document.addEventListener("django-morph:updated", function () {
    initTooltips();
    initCharts();
});
```

### `django-morph:fetch-start`

Fired when a morph fetch begins. `event.detail.url` contains the target URL.

```js
document.addEventListener("django-morph:fetch-start", function (e) {
    console.log("Navigating to:", e.detail.url);
});
```

### `django-morph:fetch-end`

Fired when a morph fetch completes successfully. `event.detail.url` contains the resolved URL.

```js
document.addEventListener("django-morph:fetch-end", function (e) {
    console.log("Arrived at:", e.detail.url);
});
```

### Loading Indicator

When a morph fetch is in progress, the `morph-loading` CSS class is added to `<html>`. The default styles (from `{% morph_js %}`) show a 3px blue progress bar at the top of the page.

Customize it:

```css
html.morph-loading::before {
    background: #dc2626;  /* red */
    height: 4px;
}
```

Or use the class to show a spinner:

```css
html.morph-loading .spinner {
    display: block;
}
```

---

## Script Loading

### How Scripts Re-execute

After each morph, django-morph scans all `<script>` tags in the DOM:

1. **External scripts with `data-morph-static`** — Only loaded once. If the `src` hasn't been seen before, it's loaded via a `<script>` element. Once loaded, it's never re-fetched.
2. **Inline scripts** — Re-executed after every morph by replacing the element with a fresh copy.
3. **External scripts without `data-morph-static`** — Re-fetched and re-executed every time (generally avoid this).

### Execution Order

When a page has both external `data-morph-static` scripts and inline scripts:

1. External scripts are loaded first (in document order)
2. All external scripts finish loading
3. Inline scripts execute (in document order)

This ensures libraries like Bootstrap, Alpine.js, or Chart.js are available before your initialization code runs.

```html
<!-- ✅ Correct: library loads before init code -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js" data-morph-static></script>
<script>
    // Runs AFTER Chart.js is loaded
    new Chart(document.getElementById("my-chart"), { ... });
</script>
```

### What to Mark as `data-morph-static`

| Script type | Use `data-morph-static`? | Why |
|---|---|---|
| CDN libraries (Bootstrap, Alpine, Chart.js, jQuery) | **Yes** | Only load once |
| Analytics (Google Analytics, Plausible) | **Yes** | Avoid double-counting |
| CSS-in-JS (Tailwind CDN) | **Yes** | Only needs to run once |
| Page-specific init code | **No** | Must re-run to bind to new DOM |
| App code that reads DOM state | **No** | Needs fresh DOM references |

---

## Auto-Preserved Elements

Django-morph automatically preserves certain HTML elements during morph, even without `data-morph-preserve`. These elements have internal state that would be lost if morphed:

| Element | Why it's auto-preserved |
|---|---|
| `<canvas>` | Pixel content is wiped on DOM recreation |
| `<video>` | Playback state and buffer would be lost |
| `<audio>` | Playback state and buffer would be lost |
| `<iframe>` | Entire browsing context reloads on recreation |
| `<embed>` | Plugin state is lost on recreation |
| `<object>` | Plugin state is lost on recreation |
| `<input type="file">` | File selection cannot be re-populated programmatically |
| `<input type="password">` | Browser autofill may not re-populate after morph |
| `<dialog open>` | Modal state and backdrop would break |
| `[contenteditable="true"]` | Cursor position and text selection lost |

These elements still need a unique `id` for idiomorph to match them between old and new DOM.

---

## Middleware

### `MorphMiddleware`

A single middleware class that handles two things:

**1. Redirect hijacking** — When a morph request receives a 301/302, the middleware:
- Captures the `Location` header
- Returns `200 OK` with `X-Morph-Redirect: <url>` header
- The client-side script reads this header and updates `history.pushState`

This is what makes Django's `redirect()` work seamlessly with morph.

**2. Vary header** — Adds `Vary: X-Django-Morph` to all responses to prevent CDN/browser cache poisoning between morph and non-morph requests.

### Placement

```python
MIDDLEWARE = [
    "django_morph.middleware.MorphMiddleware",  # ← Before SessionMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]
```

---

## System Checks

Django-morph registers a system check that runs with `python manage.py check`. It verifies:

- `MorphMiddleware` is present in `MIDDLEWARE`
- `MorphMiddleware` comes before `SessionMiddleware`
- `MorphMiddleware` comes before `MessageMiddleware`

If ordering is wrong, you'll see warnings like:

```
SystemCheckError: System check identified 1 issue:
?: morph_middleware_before_session: MorphMiddleware should be before SessionMiddleware in MIDDLEWARE.
```

---

## Known Issues & Limitations

### Web Components / Shadow DOM

Custom elements with Shadow DOM are opaque to idiomorph. The outer element is morphed normally, but internal shadow content is **not** diffed. Use `data-morph-preserve` or `data-morph-preserve-children` on custom elements.

### Third-Party Widgets

Embedded widgets (Google Maps, Stripe Elements, reCAPTCHA, embedded tweets) create complex DOM structures with internal state. Always wrap them with `data-morph-preserve-children`:

```html
<div id="map-container" data-morph-preserve-children>
    <div id="map"></div>
</div>
```

### CSS Animations

Elements mid-animation will restart their animation if morphed, even if attributes didn't change. Use `data-morph-preserve` on animated elements that shouldn't restart.

### `<textarea>` Composition (IME)

Users typing with IME (CJK input methods) may lose composition state if a morph occurs mid-typing. This is a browser limitation — the composition is tied to the specific DOM node.

### `<select multiple>`

Multiple selections may behave inconsistently across browsers after morph. Idiomorph syncs the `selected` attribute on `<option>` elements, but programmatic selections via JavaScript may need re-application in the `django-morph:updated` handler.

### Focus Restoration

Idiomorph's built-in `restoreFocus` only handles `<input>` and `<textarea>`. Focus on `<button>`, `<a>`, or other elements is lost after morph. Use the `django-morph:updated` event to restore focus manually if needed.

### Browser Autofill

Password managers and browser autofill may not re-populate values after morph, since the DOM elements are technically new instances. Use `data-morph-preserve` on forms that rely on autofill.

---

## Browser Support

All modern browsers (Chrome, Firefox, Safari, Edge). Requires `fetch`, `DOMParser`, and `AbortController`.

## License

MIT
