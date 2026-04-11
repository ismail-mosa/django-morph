from django.urls import path
from . import views

urlpatterns = [
    path("", views.task_list, name="task_list"),
    path("board/", views.task_board, name="task_board"),
    path("create/", views.task_create, name="task_create"),
    path("export/", views.task_export, name="task_export"),
    path("<int:pk>/", views.task_detail, name="task_detail"),
    path("<int:pk>/edit/", views.task_update, name="task_update"),
    path("<int:pk>/delete/", views.task_delete, name="task_delete"),
    path("<int:pk>/toggle/", views.task_toggle, name="task_toggle"),
]
