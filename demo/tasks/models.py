from django.db import models


class Task(models.Model):
    STATUS_CHOICES = [
        ("todo", "To Do"),
        ("doing", "Doing"),
        ("done", "Done"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="todo")
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="medium"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def next_status(self):
        cycle = {"todo": "doing", "doing": "done", "done": "todo"}
        return cycle.get(self.status, "todo")

    def get_next_status_display(self):
        labels = {"todo": "To Do", "doing": "Doing", "done": "Done"}
        return labels.get(self.next_status(), "To Do")

    @property
    def status_badge(self):
        colors = {
            "todo": "bg-secondary",
            "doing": "bg-warning text-dark",
            "done": "bg-success",
        }
        return colors.get(self.status, "bg-secondary")

    @property
    def priority_badge(self):
        colors = {
            "low": "bg-info",
            "medium": "bg-warning text-dark",
            "high": "bg-danger",
        }
        return colors.get(self.priority, "bg-secondary")
