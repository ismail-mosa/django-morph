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
]
