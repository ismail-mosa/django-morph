Instruction Set: Build django-morph
Objective
Create a Django package named django-morph that transforms a standard Django application into a seamless "SPA-like" experience using Idiomorph for DOM patching. The library must require zero manual HTML attributes and handle all navigation/submissions globally.

Phase 1: Project Initialization
Initialize a standard Django app structure for a reusable package.

Asset Acquisition: Download the latest idiomorph.js (specifically the ESM or UMD version) and place it in django_morph/static/django_morph/idiomorph.js.

Core Script: Create django_morph/static/django_morph/morph-client.js. This will be the main entry point.

Phase 2: The Middleware (Python)
Create django_morph/middleware.py. The middleware must:

Detect Morph Requests: Check for the header X-Django-Morph: true.

Hijack Redirects: If a request is a "Morph Request" and the response is a 301 or 302:

Capture the Location header.

Return a 200 OK response.

Set a custom header X-Morph-Redirect with the destination URL.

Set Vary Header: Ensure Vary: X-Django-Morph is added to all responses to prevent cache poisoning between AJAX and non-AJAX requests.

Phase 3: The Client-Side Engine (JavaScript)
Implement the following logic in morph-client.js:

Global Interception:

Listen for click on document. Filter for local <a> tags (exclude _blank, download, and external domains).

Listen for submit on document. Filter for local <form> tags.

The Fetch Pipeline:

On trigger, show a top-level progress bar (add .morph-loading to <html>).

Append X-Django-Morph: true to request headers.

For POST, automatically include X-CSRFToken by reading the csrftoken cookie.

The Morphing Logic:

Use DOMParser to turn the response text into a document.

Call Idiomorph.morph(document.documentElement, newDoc.documentElement, { ... }).

Config: Set callbacks to skip elements with data-morph-preserve.

Lifecycle Management:

Redirects: If X-Morph-Redirect is present, use history.pushState to update the URL.

Script Execution: Find all <script> tags in the new content and re-inject them to trigger execution.

Events: Dispatch a custom event django-morph:updated so the user can re-init third-party JS.

Phase 4: Django Integration (Template Tags)
Create django_morph/templatetags/morph_tags.py:

{% morph_js %}:

Should render the <script> tags for idiomorph.js and morph-client.js.

Include a tiny inline CSS block for the .morph-loading progress bar.

{% morph_permanent %}:

A simple helper to add the data-morph-permanent attribute to a wrapper.

Phase 5: Refinement & Edge Cases
Scroll Restoration: Ensure that on a "click" navigation, the scroll position resets to the top, but on "back/forward" browser navigation, it restores correctly.

Error Handling: If a fetch fails (500 error or network loss), perform a hard window.location.reload() to let the browser handle the error page naturally.

Execution Verification Script
Once implemented, the agent should verify by:

Checking if clicking a link changes the page content without the browser tab "spinning."

Verifying a Django redirect() updates the URL bar correctly.

Ensuring an <audio> tag with data-morph-preserve continues playing during navigation.

Prompt to give the AI Agent:
"Act as a Senior Python and JavaScript Engineer. Follow the 'django-morph' Instruction Set provided to build a Django package. Prioritize clean code and ensure Idiomorph is used correctly to handle both the <body> and the <head>. The goal is 'Zero-Config'—the user should only need to add the middleware and one template tag to make their entire site an SPA."
