(function () {
    "use strict";

    var MORPH_HEADER = "X-Django-Morph";
    var REDIRECT_HEADER = "X-Morph-Redirect";
    var PRESERVE_ATTR = "data-morph-preserve";
    var SKIP_ATTR = "data-morph";
    var STATIC_ATTR = "data-morph-static";
    var LOADING_CLASS = "morph-loading";
    var UPDATED_EVENT = "django-morph:updated";
    var FETCH_START_EVENT = "django-morph:fetch-start";
    var FETCH_END_EVENT = "django-morph:fetch-end";
    var REQUEST_TIMEOUT = 15000;
    var PREFETCH_DELAY = 100;
    var PREFETCH_MAX = 5;
    var PREFETCH_TTL = 30000;

    var currentController = null;
    var scrollPositions = {};
    var prefetchCache = new Map();
    var prefetchTimer = null;

    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
    }

    function getCSRFToken() {
        var token = getCookie("csrftoken");
        if (token) return token;
        var meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) return meta.getAttribute("content");
        var input = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (input) return input.value;
        return "";
    }

    function isLocalLink(a) {
        if (a.hostname !== window.location.hostname) return false;
        if (a.protocol !== window.location.protocol) return false;
        if (a.port !== window.location.port) return false;
        if (a.hasAttribute("download")) return false;
        if (a.getAttribute("target") === "_blank") return false;
        return true;
    }

    function isHashLink(a) {
        var href = a.getAttribute("href");
        if (!href || href === "#") return true;
        if (href.charAt(0) === "#") return true;
        try {
            var url = new URL(a.href);
            var current = new URL(window.location.href);
            return url.pathname === current.pathname && url.search === current.search && url.hash;
        } catch (e) {
            return false;
        }
    }

    function isLocalForm(form) {
        if (form.getAttribute("target") === "_blank") return false;
        if (form.hasAttribute(SKIP_ATTR) && form.getAttribute(SKIP_ATTR) === "false") return false;
        var action = form.getAttribute("action");
        if (!action) return true;
        try {
            var url = new URL(action, window.location.origin);
            return url.origin === window.location.origin;
        } catch (e) {
            return true;
        }
    }

    function shouldSkipElement(el) {
        return el.hasAttribute(SKIP_ATTR) && el.getAttribute(SKIP_ATTR) === "false";
    }

    function setLoading(on) {
        if (on) {
            document.documentElement.classList.add(LOADING_CLASS);
        } else {
            document.documentElement.classList.remove(LOADING_CLASS);
        }
    }

    function dispatchFetchEvent(name, url) {
        window.dispatchEvent(new CustomEvent(name, { detail: { url: url } }));
    }

    function saveScrollPosition() {
        scrollPositions[window.location.href] = {
            x: window.scrollX,
            y: window.scrollY
        };
    }

    function trimPrefetchCache() {
        if (prefetchCache.size <= PREFETCH_MAX) return;
        var oldest = prefetchCache.keys().next().value;
        prefetchCache.delete(oldest);
    }

    function cleanExpiredPrefetch() {
        var now = Date.now();
        prefetchCache.forEach(function (entry, key) {
            if (now - entry.time > PREFETCH_TTL) {
                prefetchCache.delete(key);
            }
        });
    }

    function getPrefetched(url) {
        cleanExpiredPrefetch();
        var entry = prefetchCache.get(url);
        if (!entry) return null;
        prefetchCache.delete(url);
        return entry;
    }

    function morphResponse(html, url, isPopstate) {
        var parser = new DOMParser();
        var newDoc = parser.parseFromString(html, "text/html");

        Idiomorph.morph(document.documentElement, newDoc.documentElement, {
            callbacks: {
                beforeNodeMorphed: function (node) {
                    if (node.nodeType === 1 && node.hasAttribute(PRESERVE_ATTR)) {
                        return false;
                    }
                },
                beforeNodeAdded: function (node) {
                    if (node.nodeType === 1 && node.hasAttribute(PRESERVE_ATTR)) {
                        var id = node.getAttribute("id");
                        if (id && document.getElementById(id)) {
                            return false;
                        }
                    }
                },
                beforeNodeRemoved: function (node) {
                    if (node.nodeType === 1 && node.hasAttribute(PRESERVE_ATTR)) {
                        return false;
                    }
                }
            }
        });

        reexecuteScripts();

        window.dispatchEvent(new CustomEvent(UPDATED_EVENT));

        if (url) {
            if (isPopstate) {
                history.replaceState({}, "", url);
            } else {
                history.pushState({}, "", url);
            }
        }
    }

    function reexecuteScripts() {
        var scripts = document.querySelectorAll("script");
        scripts.forEach(function (oldScript) {
            if (oldScript.hasAttribute(STATIC_ATTR)) return;
            if (oldScript.type && oldScript.type !== "text/javascript") return;
            var newScript = document.createElement("script");
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            Array.prototype.forEach.call(oldScript.attributes, function (attr) {
                if (attr.name !== "src") {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    function abortCurrentRequest() {
        if (currentController) {
            currentController.abort();
            currentController = null;
        }
    }

    function morphFetch(url, options, isPopstate) {
        abortCurrentRequest();

        saveScrollPosition();
        setLoading(true);
        dispatchFetchEvent(FETCH_START_EVENT, url);

        var cached = getPrefetched(url);
        if (cached && (!options || !options.method || options.method === "GET")) {
            setLoading(false);
            morphResponse(cached.html, cached.redirectUrl || url, isPopstate);
            if (isPopstate) {
                var saved = scrollPositions[window.location.href];
                if (saved) {
                    window.scrollTo(saved.x, saved.y);
                } else {
                    window.scrollTo(0, 0);
                }
            } else {
                window.scrollTo(0, 0);
            }
            dispatchFetchEvent(FETCH_END_EVENT, cached.redirectUrl || url);
            return Promise.resolve();
        }

        var controller = new AbortController();
        currentController = controller;

        options = options || {};
        options.headers = options.headers || {};
        options.headers[MORPH_HEADER] = "true";
        options.signal = controller.signal;

        var method = (options.method || "GET").toUpperCase();
        if (method !== "GET") {
            options.headers["X-CSRFToken"] = getCSRFToken();
        }

        options.credentials = "same-origin";

        var timeoutId = setTimeout(function () {
            controller.abort();
        }, REQUEST_TIMEOUT);

        return fetch(url, options)
            .then(function (response) {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error("HTTP " + response.status);
                }
                var redirectUrl = response.headers.get(REDIRECT_HEADER);
                if (redirectUrl) {
                    return fetch(redirectUrl, {
                        headers: { "X-Django-Morph": "true" },
                        credentials: "same-origin",
                        signal: controller.signal
                    }).then(function (redirectResponse) {
                        if (!redirectResponse.ok) {
                            throw new Error("HTTP " + redirectResponse.status);
                        }
                        return redirectResponse.text().then(function (html) {
                            return { html: html, redirectUrl: redirectUrl };
                        });
                    });
                }
                return response.text().then(function (html) {
                    return { html: html, redirectUrl: url };
                });
            })
            .then(function (result) {
                currentController = null;
                morphResponse(result.html, result.redirectUrl, isPopstate);
                if (isPopstate) {
                    var saved = scrollPositions[window.location.href];
                    if (saved) {
                        window.scrollTo(saved.x, saved.y);
                    } else {
                        window.scrollTo(0, 0);
                    }
                } else {
                    window.scrollTo(0, 0);
                }
                dispatchFetchEvent(FETCH_END_EVENT, result.redirectUrl);
            })
            .catch(function (err) {
                currentController = null;
                if (err.name === "AbortError") return;
                window.location.href = url;
            })
            .finally(function () {
                clearTimeout(timeoutId);
                setLoading(false);
            });
    }

    function prefetchUrl(url) {
        if (prefetchCache.has(url)) return;
        if (url === window.location.href) return;

        cleanExpiredPrefetch();

        fetch(url, {
            headers: { "X-Django-Morph": "true" },
            credentials: "same-origin"
        })
            .then(function (response) {
                if (!response.ok) return;
                var redirectUrl = response.headers.get(REDIRECT_HEADER);
                if (redirectUrl) {
                    return fetch(redirectUrl, {
                        headers: { "X-Django-Morph": "true" },
                        credentials: "same-origin"
                    }).then(function (r) {
                        if (!r.ok) return;
                        return r.text().then(function (html) {
                            return { html: html, redirectUrl: redirectUrl };
                        });
                    });
                }
                return response.text().then(function (html) {
                    return { html: html, redirectUrl: null };
                });
            })
            .then(function (result) {
                if (!result) return;
                prefetchCache.set(url, {
                    html: result.html,
                    redirectUrl: result.redirectUrl,
                    time: Date.now()
                });
                trimPrefetchCache();
            })
            .catch(function () {});
    }

    document.addEventListener("mouseover", function (e) {
        var link = e.target.closest("a[href]");
        if (!link) return;
        if (!isLocalLink(link)) return;
        if (shouldSkipElement(link)) return;
        if (isHashLink(link)) return;

        var url = link.href;
        clearTimeout(prefetchTimer);
        prefetchTimer = setTimeout(function () {
            prefetchUrl(url);
        }, PREFETCH_DELAY);
    });

    document.addEventListener("mouseout", function (e) {
        var link = e.target.closest("a[href]");
        if (!link) return;
        clearTimeout(prefetchTimer);
    });

    document.addEventListener("click", function (e) {
        var link = e.target.closest("a[href]");
        if (!link) return;
        if (!isLocalLink(link)) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        if (shouldSkipElement(link)) return;

        if (isHashLink(link)) {
            return;
        }

        e.preventDefault();
        morphFetch(link.href);
    });

    document.addEventListener("submit", function (e) {
        var form = e.target;
        if (form.tagName !== "FORM") return;
        if (!isLocalForm(form)) return;

        e.preventDefault();

        var method = (form.getAttribute("method") || "GET").toUpperCase();
        var action = form.getAttribute("action") || window.location.href;
        var options = { method: method };

        if (method === "GET") {
            var params = new URLSearchParams(new FormData(form)).toString();
            if (params) {
                action = action.split("?")[0] + "?" + params;
            }
        } else {
            options.body = new FormData(form);
        }

        morphFetch(action, options);
    });

    window.addEventListener("popstate", function () {
        morphFetch(window.location.href, null, true);
    });
})();
