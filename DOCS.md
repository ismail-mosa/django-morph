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

### `data-morph-target`

Targets a specific DOM element for morph instead of the entire page. Only the matching element is updated — the rest of the page stays untouched. The page title, head, and scripts outside the target are not affected.

```html
<a href="/stats/" data-morph-target="#stats-panel">Refresh Stats</a>

<div id="stats-panel">
    <p>Users: 1,247</p>
    <p>Revenue: $12,345</p>
</div>
```

Works with both links and forms:

```html
<form method="post" action="/search/" data-morph-target="#search-results">
    <input name="q" placeholder="Search...">
    <button type="submit">Search</button>
</form>

<div id="search-results">
    <!-- Only this div updates on submit -->
</div>
```

### `data-morph-swap`

Controls how the new content is merged into the target element. Only used with `data-morph-target`.

| Value | Behavior |
|---|---|
| `morph` (default) | Idiomorph diffs and patches the target element |
| `innerHTML` | Replaces all children of the target |
| `beforeend` | Appends new children to the end of the target |
| `afterbegin` | Prepends new children to the start of the target |

```html
<!-- Append new items without removing existing ones -->
<a href="/comments/" data-morph-target="#comment-list" data-morph-swap="beforeend">Load More</a>
```

### `data-morph-push`

Controls whether partial morph updates the browser URL. Only used with `data-morph-target`.

| Value | Behavior |
|---|---|
| `false` (default) | URL does not change |
| `true` | URL is pushed to browser history |

```html
<a href="/page/2/" data-morph-target="#content" data-morph-push="true">Next Page</a>
```

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

### Partial Morph Targets

Use `data-morph-target` to update only a specific element instead of the entire page. The server returns a full HTML page as usual — django-morph extracts the matching element and morphs only that part.

**Refresh a panel without affecting the rest of the page:**

```html
<a href="/dashboard/" data-morph-target="#stats">Refresh Stats</a>

<div id="stats">
    <p>Users: {{ user_count }}</p>
    <p>Revenue: {{ revenue }}</p>
</div>
```

**Search-as-you-type:**

```html
<form method="get" action="/search/"
      data-morph-target="#results"
      data-morph-swap="innerHTML">
    <input name="q" placeholder="Search...">
</form>

<div id="results">
    {% for item in items %}
    <div>{{ item.name }}</div>
    {% endfor %}
</div>
```

**Append items (infinite scroll / load more):**

```html
<a href="/feed/?page={{ next_page }}"
   data-morph-target="#feed-items"
   data-morph-swap="beforeend">Load More</a>

<div id="feed-items">
    {% for item in page_items %}
    <div class="feed-item">{{ item.title }}</div>
    {% endfor %}
</div>
```

**Form submit with partial update:**

```html
<form method="post" action="/like/{{ post.id }}/"
      data-morph-target="#like-count-{{ post.id }}"
      data-morph-swap="innerHTML">
    {% csrf_token %}
    <button type="submit">Like</button>
</form>

<span id="like-count-{{ post.id }}">{{ post.likes }} likes</span>
```

**Update URL on partial morph:**

```html
<a href="/page/2/"
   data-morph-target="#content"
   data-morph-push="true">Next Page</a>
```

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

### `django-morph:error`

Fired when a morph request fails. `event.detail` contains `url` and either `status` (HTTP error) or `error` (network failure message).

```js
document.addEventListener("django-morph:error", function (e) {
    console.log("Failed:", e.detail.url, e.detail.status || e.detail.error);
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

### Programmatic API

django-morph exposes `window.DjangoMorph` for JavaScript-driven navigation:

```js
// Navigate to a URL (full page morph)
DjangoMorph.navigate("/dashboard/");

// Navigate with partial target
DjangoMorph.navigate("/stats/", { target: "#stats-panel" });

// Navigate with partial target + swap + push
DjangoMorph.navigate("/page/2/", {
    target: "#content",
    swap: "innerHTML",
    push: true
});

// Refresh current page
DjangoMorph.refresh();
```

Useful for: redirecting after AJAX, refreshing after WebSocket notifications, polling for updates.

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

## View Transitions

Django-morph uses the [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) for smooth cross-fade animations during full-page morphs. This provides a polished SPA-like feel with zero configuration.

**Supported in:** Chrome 111+, Edge 111+, Safari 18+. Falls back to instant DOM swap in unsupported browsers.

**Customize the transition:**

```css
::view-transition-old(root) {
    animation: 150ms fade-out ease-in;
}
::view-transition-new(root) {
    animation: 150ms fade-in ease-out;
}
```

To disable view transitions globally:

```css
* {
    view-transition-name: none !important;
}
```

## Error Handling

When a morph request fails (4xx/5xx), django-morph morphs the error page content instead of forcing a hard reload. This means Django's debug error pages render inline, and your custom 404/500 templates display seamlessly.

A `django-morph:error` event fires with `detail.url` and either `detail.status` (for HTTP errors) or `detail.error` (for network failures):

```js
document.addEventListener("django-morph:error", function (e) {
    console.error("Morph failed:", e.detail);
});
```

Network failures (offline, DNS errors, timeouts) still fall back to a hard reload.

## Focus Restoration

After each morph, django-morph attempts to restore focus to the previously focused element (matched by `id`). This preserves keyboard navigation flow and screen reader position.

For partial morphs (`data-morph-target`), focus is not affected outside the target.

## Testing

### Django Test Helpers

Django-morph includes a `MorphTestCase` class and `MorphClient` for testing morph-specific behavior:

```python
from django_morph.test import MorphTestCase

class MyTests(MorphTestCase):
    def test_morph_redirect(self):
        response = self.client.post("/contact/", {"name": "Test"})
        self.assertMorphRedirect(response, "/success/")

    def test_morph_vary_header(self):
        response = self.client.get("/about/")
        self.assertMorphVary(response)

    def test_morph_ok(self):
        response = self.client.get("/about/")
        self.assertMorphOK(response)
```

`MorphClient` automatically sends `X-Django-Morph: true` on every request, so your middleware behaves as it would during a real morph navigation.

### E2E Tests

The project includes 34 Playwright E2E tests covering all core features. Run them with:

```bash
npm install @playwright/test
npx playwright install chromium
npx playwright test --config tests/e2e/playwright.config.js
```

---

## django-morph vs HTMX

A common question: when should you use django-morph vs HTMX?

### Use django-morph when:

- You have an **existing Django project** and want it to "feel fast" with minimal changes
- You want **zero per-element markup** — no adding attributes to every link and form
- Your views already return full HTML pages and you don't want to change them
- You want Django-specific integrations (CSRF, messages, redirects) handled automatically
- Your team doesn't want to learn a new paradigm — Django-morph is invisible

### Use HTMX when:

- You need **partial page updates** as the primary interaction model (tabs, inline editing, live search)
- You want fine-grained control over what updates and when (`hx-target`, `hx-trigger`, `hx-swap`)
- You need **real-time features** (SSE, WebSocket via extensions)
- You're building a highly interactive UI with many independent dynamic regions
- You're not using Django (HTMX is backend-agnostic)

### Use django-morph AND HTMX when:

- You want full-page SPA navigation for free (django-morph) plus interactive widgets (HTMX)
- Add `data-morph="false"` to links/forms that HTMX should handle

### The migration path

Many projects start with django-morph and later add HTMX for specific interactive components. When the complexity grows past what django-morph handles well, HTMX is the natural next step.

---

## Browser Support

All modern browsers (Chrome, Firefox, Safari, Edge). Requires `fetch`, `DOMParser`, and `AbortController`.

View Transitions API: Chrome 111+, Edge 111+, Safari 18+. Gracefully degrades in unsupported browsers.

## License

MIT
