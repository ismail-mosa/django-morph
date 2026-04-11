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
