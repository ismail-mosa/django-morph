from django.core.management.base import BaseCommand
from tasks.models import Task


class Command(BaseCommand):
    help = "Create sample tasks for the demo app"

    def handle(self, *args, **options):
        samples = [
            (
                "Design homepage mockup",
                "Create wireframes and high-fidelity mockup for the new landing page",
                "done",
                "high",
            ),
            (
                "Set up CI/CD pipeline",
                "Configure GitHub Actions for automated testing and deployment",
                "done",
                "high",
            ),
            (
                "Write API documentation",
                "Document all REST endpoints with request/response examples",
                "doing",
                "medium",
            ),
            (
                "Implement user authentication",
                "Add login, logout, and password reset flows using django-allauth",
                "doing",
                "high",
            ),
            (
                "Refactor database queries",
                "Optimize N+1 queries on the dashboard and list views",
                "doing",
                "medium",
            ),
            (
                "Add dark mode support",
                "Implement theme toggle with CSS custom properties and localStorage persistence",
                "todo",
                "low",
            ),
            (
                "Fix mobile layout issues",
                "Responsive breakpoints for tables and navigation on small screens",
                "todo",
                "high",
            ),
            (
                "Write unit tests for checkout",
                "Cover cart calculation, discount codes, and payment flow edge cases",
                "todo",
                "medium",
            ),
            (
                "Upgrade to Django 5.0",
                "Migrate from 4.2 LTS, update deprecated APIs, run full test suite",
                "todo",
                "low",
            ),
            (
                "Set up error monitoring",
                "Integrate Sentry for exception tracking and performance monitoring",
                "todo",
                "medium",
            ),
        ]
        count = 0
        for title, description, status, priority in samples:
            task, created = Task.objects.get_or_create(
                title=title,
                defaults={
                    "description": description,
                    "status": status,
                    "priority": priority,
                },
            )
            if created:
                count += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Created {count} sample tasks ({Task.objects.count()} total)"
            )
        )
