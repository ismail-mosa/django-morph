from django.contrib import messages
from django.shortcuts import redirect, render
from django.http import HttpResponse


def favicon(request):
    return HttpResponse(b"", content_type="image/x-icon")


from testproject.testapp.models import Item


def index(request):
    return render(request, "testapp/index.html")


def about(request):
    return render(request, "testapp/about.html")


def contact(request):
    return render(request, "testapp/contact.html")


def contact_submit(request):
    if request.method == "POST":
        name = request.POST.get("name", "anonymous")
        messages.success(request, f"Thank you {name}, your message has been sent!")
        return redirect(f"/success/?name={name}")
    return redirect("contact")


def success(request):
    name = request.GET.get("name", "anonymous")
    return render(request, "testapp/success.html", {"name": name})


def error_page(request):
    return HttpResponse("Server Error", status=500)


def charts(request):
    return render(request, "testapp/charts.html")


def long_page(request):
    return render(request, "testapp/long_page.html")


def anchors(request):
    return render(request, "testapp/anchors.html")


def widgets(request):
    return render(request, "testapp/widgets.html")


def bootstrap_page(request):
    return render(request, "testapp/bootstrap.html")


def tailwind_page(request):
    return render(request, "testapp/tailwind.html")


def js_test_page(request):
    return render(request, "testapp/js_test.html")


def partial_page(request):
    items = Item.objects.all()[:5]
    return render(request, "testapp/partial_full.html", {"items": items})


def feed_page(request):
    page = int(request.GET.get("page", 1))
    all_feed = [
        {
            "author": "Alice Johnson",
            "text": "Just deployed a new Django app using django-morph! The page transitions are so smooth.",
            "time": f"{page}h ago",
        },
        {
            "author": "Bob Smith",
            "text": "Has anyone tried using SortableJS with morph navigation? The drag state resets but that's expected.",
            "time": f"{page + 1}h ago",
        },
        {
            "author": "Carol White",
            "text": "Tip: use data-morph-preserve on your audio players to keep music playing during navigation.",
            "time": f"{page + 2}h ago",
        },
        {
            "author": "Dave Brown",
            "text": "The partial response pattern is really clean. Server sends less data, client patches the DOM.",
            "time": f"{page + 3}h ago",
        },
        {
            "author": "Eve Davis",
            "text": "Alpine.js reactivity works great after morph — just remember x-data re-initializes.",
            "time": f"{page + 4}h ago",
        },
    ]
    per_page = 3
    start = (page - 1) * per_page
    feed_items = all_feed[start : start + per_page]
    if not feed_items:
        feed_items = all_feed[:per_page]
    next_page = page + 1
    return render(
        request,
        "testapp/feed.html",
        {
            "feed_items": feed_items,
            "page": page,
            "next_page": next_page,
        },
    )


def forms_page(request):
    return render(request, "testapp/forms.html")


def forms_submit(request):
    if request.method == "POST":
        name = request.POST.get("name", "Unknown")
        messages.success(request, f"Form submitted for {name}!")
    return redirect("/forms/")


def live_page(request):
    return render(request, "testapp/live.html")


def item_list(request):
    items = Item.objects.all()
    show_modal = request.GET.get("add") == "1"
    return render(
        request,
        "testapp/items.html",
        {
            "items": items,
            "show_modal": show_modal,
        },
    )


def item_create(request):
    if request.method == "POST":
        title = request.POST.get("title", "")
        description = request.POST.get("description", "")
        if title:
            Item.objects.create(title=title, description=description)
            messages.success(request, f'Item "{title}" created successfully!')
        else:
            messages.error(request, "Title is required.")
            return redirect("/items/?add=1")
        return redirect("/items/")
    return redirect("/items/?add=1")
