class MorphMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        is_morph = request.META.get("HTTP_X_DJANGO_MORPH") == "true"

        if is_morph and response.status_code in (301, 302):
            redirect_url = response.get("Location", "")
            response.status_code = 200
            response.headers["X-Morph-Redirect"] = redirect_url
            if "Location" in response.headers:
                del response.headers["Location"]

        if "Vary" in response.headers:
            if "X-Django-Morph" not in response.headers["Vary"]:
                response.headers["Vary"] += ", X-Django-Morph"
        else:
            response.headers["Vary"] = "X-Django-Morph"

        return response
