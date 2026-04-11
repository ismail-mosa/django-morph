from django import template
from django.conf import settings
from django.templatetags.static import static
from django.utils.safestring import mark_safe

register = template.Library()


@register.simple_tag
def morph_js():
    css = """<style>
html.morph-loading::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: #29d;
    z-index: 99999;
    animation: morph-progress 300ms ease-in-out;
}
@keyframes morph-progress {
    0% { width: 0; }
    100% { width: 100%; }
}
</style>"""

    idiomorph_url = static("django_morph/idiomorph.js")

    if getattr(settings, "DEBUG", True):
        morph_client_url = static("django_morph/morph-client.js")
    else:
        morph_client_url = static("django_morph/morph-client.min.js")

    scripts = (
        f'<script src="{idiomorph_url}" data-morph-static></script>\n'
        f'<script src="{morph_client_url}" data-morph-static></script>'
    )

    return mark_safe(css + scripts)


@register.simple_tag
def morph_permanent():
    return mark_safe('data-morph-preserve="true"')
