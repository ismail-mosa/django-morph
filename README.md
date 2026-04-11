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

**2. Add the middleware:**

```python
MIDDLEWARE = [
    "django_morph.middleware.MorphMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    ...
]
```

> **Important:** `MorphMiddleware` must be placed **before** `SessionMiddleware` and `MessageMiddleware`. Django-morph includes a system check that will warn you if the ordering is wrong.

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

That's it. All local `<a>` clicks and `<form>` submissions are now intercepted and morphed.

## How It Works

1. **Client-side** (`morph-client.js`) intercepts clicks on local `<a>` tags and form submissions
2. Sends a `fetch()` request with the `X-Django-Morph: true` header
3. **Middleware** intercepts 301/302 redirects, converts them to 200 + `X-Morph-Redirect` header
4. Client uses **Idiomorph** to diff and patch the DOM — no full page reload
5. URL bar updates via `history.pushState`

## Template Tags

### `{% morph_js %}`

Renders the `<script>` tags for idiomorph.js and morph-client.js, plus inline CSS for the progress bar. Must be placed in your base template's `<head>`.

```html
{% load morph_tags %}
<head>
    {% morph_js %}
</head>
```

In production (`DEBUG=False`), the minified `morph-client.min.js` is served automatically.

### `{% morph_permanent %}`

Adds the `data-morph-preserve` attribute to an element, preventing it from being modified during morph operations. Useful for audio/video players, live widgets, or any element that should persist across navigations.

> **Note:** The element **must** have a unique `id` attribute for preservation to work correctly.

```html
<div id="audio-player" {% morph_permanent %}>
    <audio controls src="/music.mp3"></audio>
</div>
```

## HTML Attributes

### `data-morph-preserve`

Prevents an element from being morphed, removed, or duplicated during navigation. The element persists exactly as-is. Requires a unique `id`.

```html
<div id="live-chat" data-morph-preserve="true">
    <!-- This element survives all navigations -->
</div>
```

### `data-morph="false"`

Opts out of morph behavior for a specific link or form. Forces a full page reload instead.

```html
<a href="/download/" data-morph="false">Download PDF</a>

<form action="/payment/" method="post" data-morph="false">
    <!-- This form always does a full submit -->
</form>
```

### `data-morph-static`

Prevents a `<script>` from being re-executed after morph. Use this for library scripts that should only run once.

```html
<script src="/static/analytics.js" data-morph-static></script>
```

### `data-morph-preserve-children`

Prevents **all children** inside the element from being morphed, removed, or added. Useful for third-party widgets (Stripe, Google Maps, reCAPTCHA) that create complex internal DOM structures.

```html
<div id="stripe-card-element" data-morph-preserve-children>
    <!-- Stripe.js creates internal iframes here — all preserved -->
</div>
```

Unlike `data-morph-preserve`, this does not require the children to have `id` attributes.

## Events

### `django-morph:updated`

Fired after every successful DOM morph. Use it to re-initialize third-party JavaScript.

```js
document.addEventListener("django-morph:updated", function () {
    // Re-init charts, tooltips, etc.
    initTooltips();
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

Fired when a morph fetch completes successfully. `event.detail.url` contains the target URL.

```js
document.addEventListener("django-morph:fetch-end", function (e) {
    console.log("Arrived at:", e.detail.url);
});
```

## Features

- **Zero-config** — Works on all local links and forms automatically
- **Redirect handling** — Django's `redirect()` works seamlessly, URL bar updates correctly
- **CSRF support** — Automatically includes CSRF token from cookie, `<meta>` tag, or form input
- **Script re-execution** — Inline scripts re-run after morph; mark libraries with `data-morph-static`
- **Element preservation** — Keep audio/video/stateful widgets alive during navigation
- **Auto-preservation** — Canvas, video, audio, iframe, file inputs, dialogs automatically preserved
- **Child preservation** — `data-morph-preserve-children` protects entire widget subtrees
- **Scroll restoration** — Scrolls to top on navigation, restores position on browser back/forward
- **Link prefetch** — Pre-fetches pages on hover for instant navigation
- **Request cancellation** — Aborts previous request if a new navigation starts
- **Timeout handling** — 15s timeout with fallback to hard reload
- **Hash links** — Same-page anchor links (`#section`) work natively, no morph
- **Opt-out** — `data-morph="false"` on any link or form forces full page reload
- **Minified** — Production builds use `morph-client.min.js` (60% smaller)
- **Django messages** — Works with the messages framework through redirects

## How Forms Work

Forms are intercepted and submitted via `fetch()`. On redirect, the client follows the redirect URL and morphs the result. Django success/error messages work as expected.

```python
def item_create(request):
    if request.method == "POST":
        form = ItemForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Item created!")
            return redirect("item_list")  # URL bar updates, DOM morphs
        messages.error(request, "Please fix the errors.")
        return redirect("item_list")
```

## System Checks

Django-morph registers a system check that warns if `MorphMiddleware` is not correctly positioned in your `MIDDLEWARE` setting. Run `python manage.py check` to verify.

## Auto-Preserved Elements

Django-morph automatically preserves certain HTML elements during morph, even without `data-morph-preserve`. These elements have internal state that would be lost if morphed:

| Element | Why it's auto-preserved |
|---------|------------------------|
| `<canvas>` | Pixel content is wiped on DOM recreation |
| `<video>` | Playback state and buffer would be lost |
| `<audio>` | Playback state and buffer would be lost |
| `<iframe>` | Entire browsing context reloads on recreation |
| `<embed>` | Plugin state is lost on recreation |
| `<object>` | Plugin state is lost on recreation |
| `<input type="file">` | File selection cannot be re-populated programmatically |
| `<input type="password">` | Browser autofill may not re-populate after morph |
| `<dialog open>` | Modal state and backdrop would break |
| `[contenteditable]` | Cursor position and text selection lost |

These elements still need a unique `id` for idiomorph to match them correctly between old and new DOM.

## Known Issues & Limitations

### Web Components / Shadow DOM

Custom elements with Shadow DOM are opaque to idiomorph. The outer element is morphed normally, but internal shadow content is **not** diffed. Use `data-morph-preserve` or `data-morph-preserve-children` on custom elements.

### Third-Party Widgets

Embedded widgets (Google Maps, Stripe Elements, reCAPTCHA, embedded tweets, etc.) create complex DOM structures with internal state. Always wrap them with `data-morph-preserve-children`:

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

## Browser Support

All modern browsers (Chrome, Firefox, Safari, Edge). Requires `fetch`, `DOMParser`, and `AbortController`.

## License

MIT
