# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 — 2026-04-12

Initial release.

### Added

- Global SPA-like navigation via Idiomorph DOM patching — zero per-element markup required
- `MorphMiddleware` — hijacks 301/302 redirects for seamless morph-compatible navigation, adds `Vary: X-Django-Morph` header
- `{% morph_js %}` template tag — renders idiomorph.js, morph-client.js, and progress bar CSS
- `{% morph_permanent %}` template tag — adds `data-morph-preserve` attribute
- `data-morph-preserve` / `dm-preserve` — preserve elements across navigations
- `data-morph-preserve-children` / `dm-preserve-children` — preserve all children of an element
- `data-morph="false"` / `dm="false"` — opt out of morph for specific links/forms
- `data-morph-static` / `dm-static` — load external scripts only once
- `data-morph-target` / `dm-target` — partial morph targeting a specific DOM element
- `data-morph-swap` / `dm-swap` — control merge strategy: `morph`, `innerHTML`, `beforeend`, `afterbegin`
- `data-morph-push` / `dm-push` — control URL history push for partial morphs
- `dm-*` shorthand prefix for all `data-morph-*` attributes
- Auto-preservation of `<canvas>`, `<video>`, `<audio>`, `<iframe>`, `<embed>`, `<object>`, `<input type="file">`, `<input type="password">`, `<dialog open>`, `[contenteditable="true"]`
- View Transitions API — cross-fade animations on forward navigation (Chrome 111+, Safari 18+)
- Link prefetch on hover — LRU cache (5 entries, 30s TTL)
- Script re-execution with correct ordering — external `data-morph-static` scripts load before inline scripts
- Scroll restoration on browser back/forward
- Hash/anchor link support — smooth scrolling without triggering morph fetches
- Focus restoration after morph
- Progress bar (0% → 80% → 100%) with CSS class `morph-loading` on `<html>`
- `django-morph:updated` event — fires after every DOM morph
- `django-morph:fetch-start` / `django-morph:fetch-end` events — loading state tracking
- `django-morph:error` event — error feedback (4xx/5xx morphed inline, network failures fall back to hard reload)
- `window.DjangoMorph.navigate(url, options)` — programmatic navigation API
- `window.DjangoMorph.refresh()` — refresh current page via morph
- CSRF token resolution — cookie → meta tag → hidden input
- AbortController — concurrent navigations cancel previous requests
- 15s request timeout
- Django system checks — validates middleware ordering (`MorphMiddleware` before `SessionMiddleware` and `MessageMiddleware`)
- `MorphTestCase` and `MorphClient` test helpers
- 38 Python unit tests
- 34 Playwright E2E tests
- GitHub Actions CI — Python 3.8–3.12 × Django 3.2–5.0 matrix + E2E job
- Full documentation (DOCS.md) with patterns, events, vs HTMX comparison, migration guide
- Demo app — Bootstrap 5 TaskBoard CRUD with feature tour page
- `seed_tasks` management command for demo data
