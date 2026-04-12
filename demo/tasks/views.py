from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import HttpResponse
from .models import Task
from .forms import TaskForm


def demo_home(request):
    return render(request, "tasks/demo_home.html")


def trigger_error(request):
    raise Exception(
        "Deliberate 500 error — this demonstrates django-morph error handling."
    )


def task_list(request):
    status_filter = request.GET.get("status", "")
    search = request.GET.get("q", "")
    tasks = Task.objects.all()
    if status_filter:
        tasks = tasks.filter(status=status_filter)
    if search:
        tasks = tasks.filter(title__icontains=search)
    counts = {
        "all": Task.objects.count(),
        "todo": Task.objects.filter(status="todo").count(),
        "doing": Task.objects.filter(status="doing").count(),
        "done": Task.objects.filter(status="done").count(),
    }
    return render(
        request,
        "tasks/task_list.html",
        {
            "tasks": tasks,
            "counts": counts,
            "status_filter": status_filter,
            "search": search,
        },
    )


def task_board(request):
    todo_tasks = Task.objects.filter(status="todo")
    doing_tasks = Task.objects.filter(status="doing")
    done_tasks = Task.objects.filter(status="done")
    return render(
        request,
        "tasks/task_board.html",
        {
            "todo_tasks": todo_tasks,
            "doing_tasks": doing_tasks,
            "done_tasks": done_tasks,
        },
    )


def task_detail(request, pk):
    task = get_object_or_404(Task, pk=pk)
    return render(request, "tasks/task_detail.html", {"task": task})


def task_create(request):
    if request.method == "POST":
        form = TaskForm(request.POST)
        if form.is_valid():
            task = form.save()
            messages.success(request, f'Task "{task.title}" created!')
            return redirect("task_detail", pk=task.pk)
    else:
        form = TaskForm()
    return render(request, "tasks/task_form.html", {"form": form, "action": "Create"})


def task_update(request, pk):
    task = get_object_or_404(Task, pk=pk)
    if request.method == "POST":
        form = TaskForm(request.POST, instance=task)
        if form.is_valid():
            form.save()
            messages.success(request, f'Task "{task.title}" updated!')
            return redirect("task_detail", pk=task.pk)
    else:
        form = TaskForm(instance=task)
    return render(
        request,
        "tasks/task_form.html",
        {"form": form, "action": "Update", "task": task},
    )


def task_delete(request, pk):
    task = get_object_or_404(Task, pk=pk)
    if request.method == "POST":
        title = task.title
        task.delete()
        messages.success(request, f'Task "{title}" deleted!')
        return redirect("task_list")
    return render(request, "tasks/task_confirm_delete.html", {"task": task})


def task_toggle(request, pk):
    task = get_object_or_404(Task, pk=pk)
    task.status = task.next_status()
    task.save(update_fields=["status", "updated_at"])
    labels = {"todo": "To Do", "doing": "In Progress", "done": "Done"}
    messages.info(request, f"{task.title} moved to {labels[task.status]}")
    return redirect(request.META.get("HTTP_REFERER", "task_list"))


def task_export(request):
    import csv

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="tasks.csv"'
    writer = csv.writer(response)
    writer.writerow(["Title", "Description", "Status", "Priority", "Created"])
    for task in Task.objects.all():
        writer.writerow(
            [
                task.title,
                task.description,
                task.get_status_display(),
                task.get_priority_display(),
                task.created_at,
            ]
        )
    return response
