from django.urls import path
from testproject.testapp import views

urlpatterns = [
    path("favicon.ico", views.favicon),
    path("", views.index, name="index"),
    path("about/", views.about, name="about"),
    path("contact/", views.contact, name="contact"),
    path("contact/submit/", views.contact_submit, name="contact_submit"),
    path("success/", views.success, name="success"),
    path("error/", views.error_page, name="error"),
    path("items/", views.item_list, name="items"),
    path("items/add/", views.item_create, name="item_create"),
    path("charts/", views.charts, name="charts"),
    path("long/", views.long_page, name="long_page"),
    path("anchors/", views.anchors, name="anchors"),
    path("widgets/", views.widgets, name="widgets"),
    path("bootstrap/", views.bootstrap_page, name="bootstrap"),
    path("tailwind/", views.tailwind_page, name="tailwind"),
    path("js-test/", views.js_test_page, name="js_test"),
    path("partial/", views.partial_page, name="partial"),
    path("feed/", views.feed_page, name="feed"),
    path("forms/", views.forms_page, name="forms"),
    path("forms/submit/", views.forms_submit, name="forms_submit"),
    path("live/", views.live_page, name="live"),
    path("partial-target/", views.partial_target_demo, name="partial_target"),
]
