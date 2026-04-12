from django.urls import path, include
from tasks import views as task_views

urlpatterns = [
    path("home/", task_views.demo_home, name="demo_home"),
    path("error/", task_views.trigger_error, name="trigger_error"),
    path("", include("tasks.urls")),
]
