from django import template
from django.conf import settings
from django.templatetags.static import static
from django.utils.safestring import mark_safe

register = template.Library()


@register.simple_tag
def morph_js():
    css = """<style>
#morph-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: #29d;
    z-index: 99999;
    width: 0;
    opacity: 0;
    pointer-events: none;
}
html.morph-loading::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(34,170,255,0.15);
    z-index: 99998;
    pointer-events: none;
}
</style>
<div id="morph-progress-bar"></div>"""

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
