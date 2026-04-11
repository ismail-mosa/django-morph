from django.urls import path, include

urlpatterns = [
    path("", include("testproject.testapp.urls")),
]
