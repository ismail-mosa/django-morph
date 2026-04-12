(function () {
    "use strict";

    var MORPH_HEADER = "X-Django-Morph";
    var REDIRECT_HEADER = "X-Morph-Redirect";
    var PRESERVE_ATTR = "data-morph-preserve";
    var PRESERVE_CHILDREN_ATTR = "data-morph-preserve-children";
    var SKIP_ATTR = "data-morph";
    var STATIC_ATTR = "data-morph-static";
    var TARGET_ATTR = "data-morph-target";
    var SWAP_ATTR = "data-morph-swap";
    var PUSH_ATTR = "data-morph-push";
    var LOADING_CLASS = "morph-loading";
    var UPDATED_EVENT = "django-morph:updated";
    var FETCH_START_EVENT = "django-morph:fetch-start";
    var FETCH_END_EVENT = "django-morph:fetch-end";
    var ERROR_EVENT = "django-morph:error";
    var REQUEST_TIMEOUT = 15000;
    var PREFETCH_DELAY = 100;
    var PREFETCH_MAX = 5;
    var PREFETCH_TTL = 30000;
    var RISKY_TAGS = { CANVAS: 1, VIDEO: 1, AUDIO: 1, IFRAME: 1, EMBED: 1, OBJECT: 1 };
    var RISKY_INPUT_TYPES = { file: 1, password: 1 };

    var currentController = null;
    var scrollPositions = {};
    var prefetchCache = new Map();
    var prefetchTimer = null;
    var executedStaticScripts = new Set();
    var progressBar = null;
    var progressBarTimer = null;
    var savedFocusId = null;

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

    function isRiskyElement(node) {
        if (node.nodeType !== 1) return false;
        if (node.tagName in RISKY_TAGS) return true;
        if (node.tagName === "INPUT") {
            var type = (node.getAttribute("type") || "text").toLowerCase();
            if (type in RISKY_INPUT_TYPES) return true;
        }
        if (node.tagName === "DIALOG" && node.hasAttribute("open")) return true;
        if (node.getAttribute("contenteditable") === "true") return true;
        return false;
    }

    function shouldPreserveNode(node) {
        if (node.nodeType !== 1) return false;
        if (node.hasAttribute(PRESERVE_ATTR)) return true;
        if (isRiskyElement(node)) return true;
        return false;
    }

    function isInsidePreserveChildren(node) {
        var parent = node.parentNode;
        while (parent && parent !== document.documentElement) {
            if (parent.nodeType === 1 && parent.hasAttribute(PRESERVE_CHILDREN_ATTR)) {
                return true;
            }
            parent = parent.parentNode;
        }
        return false;
    }

    function setLoading(on) {
        if (on) {
            document.documentElement.classList.add(LOADING_CLASS);
        } else {
            document.documentElement.classList.remove(LOADING_CLASS);
        }
    }

    function startProgress() {
        if (!progressBar) {
            progressBar = document.getElementById("morph-progress-bar");
        }
        if (!progressBar) return;
        progressBar.style.transition = "none";
        progressBar.style.width = "0%";
        progressBar.style.opacity = "1";
        requestAnimationFrame(function () {
            progressBar.style.transition = "width 200ms ease-out";
            progressBar.style.width = "80%";
        });
    }

    function finishProgress() {
        if (!progressBar) {
            progressBar = document.getElementById("morph-progress-bar");
        }
        if (!progressBar) return;
        progressBar.style.transition = "width 150ms ease-in";
        progressBar.style.width = "100%";
        setTimeout(function () {
            progressBar.style.transition = "opacity 300ms ease-out";
            progressBar.style.opacity = "0";
            setTimeout(function () {
                progressBar.style.width = "0%";
            }, 300);
        }, 150);
    }

    function dispatchFetchEvent(name, url) {
        window.dispatchEvent(new CustomEvent(name, { detail: { url: url } }));
    }

    function saveFocus() {
        var active = document.activeElement;
        if (!active || active === document.body || active === document.documentElement) {
            savedFocusId = null;
            return;
        }
        savedFocusId = active.getAttribute("id");
        if (!savedFocusId) {
            savedFocusId = "__morph_focus_" + Date.now();
            active.setAttribute("id", savedFocusId);
        }
    }

    function restoreFocus() {
        if (!savedFocusId) return;
        var el = document.getElementById(savedFocusId);
        if (el) {
            try { el.focus(); } catch (e) {}
        }
        savedFocusId = null;
    }

    function saveScrollPosition() {
        var key = window.location.href.split("#")[0];
        scrollPositions[key] = {
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

    function getMorphOptions(el) {
        var target = el.getAttribute(TARGET_ATTR);
        if (!target) return null;
        return {
            target: target,
            swap: el.getAttribute(SWAP_ATTR) || "morph",
            push: el.getAttribute(PUSH_ATTR) === "true"
        };
    }

    function makeIdiomorphCallbacks() {
        return {
            callbacks: {
                beforeNodeMorphed: function (node) {
                    if (shouldPreserveNode(node)) return false;
                    if (isInsidePreserveChildren(node)) return false;
                },
                beforeNodeAdded: function (node) {
                    if (node.nodeType === 1 && node.tagName === "SCRIPT" && node.hasAttribute(STATIC_ATTR)) {
                        var src = node.getAttribute("src");
                        if (src) {
                            var existing = document.querySelector('script[src="' + src + '"]');
                            if (existing) return false;
                        }
                    }
                    if (shouldPreserveNode(node)) {
                        var id = node.getAttribute("id");
                        if (id && document.getElementById(id)) {
                            return false;
                        }
                    }
                },
                beforeNodeRemoved: function (node) {
                    if (shouldPreserveNode(node)) return false;
                    if (isInsidePreserveChildren(node)) return false;
                    if (node.nodeType === 1 && node.tagName === "SCRIPT" && node.hasAttribute(STATIC_ATTR)) {
                        return false;
                    }
                }
            }
        };
    }

    function hasViewTransitions() {
        return typeof document.startViewTransition === "function";
    }

    function morphResponse(html, url, isPopstate, morphOptions) {
        var parser = new DOMParser();
        var newDoc = parser.parseFromString(html, "text/html");

        saveFocus();

        var doMorph = function () {
            if (morphOptions && morphOptions.target) {
                partialMorph(newDoc, morphOptions);
            } else {
                fullMorph(newDoc);
            }

            var scriptRoot = (morphOptions && morphOptions.target)
                ? document.querySelector(morphOptions.target)
                : null;

            reexecuteScripts(scriptRoot).then(function () {
                restoreFocus();
                window.dispatchEvent(new CustomEvent(UPDATED_EVENT, {
                    detail: { url: url, target: morphOptions ? morphOptions.target : null }
                }));
                if (!morphOptions || !morphOptions.target) {
                    lastPathname = window.location.pathname + window.location.search;
                }
            });
        };

        if (hasViewTransitions() && !isPopstate && (!morphOptions || !morphOptions.target)) {
            document.startViewTransition(doMorph);
        } else {
            doMorph();
        }

        if (url && (!morphOptions || morphOptions.push || !morphOptions.target)) {
            if (isPopstate) {
                history.replaceState({}, "", url);
            } else if (morphOptions && morphOptions.target && !morphOptions.push) {
            } else {
                history.pushState({}, "", url);
            }
        }
    }

    function fullMorph(newDoc) {
        Idiomorph.morph(document.documentElement, newDoc.documentElement, makeIdiomorphCallbacks());

        var newTitle = newDoc.querySelector("title");
        if (newTitle && newTitle.textContent) {
            document.title = newTitle.textContent;
        }
    }

    function partialMorph(newDoc, morphOptions) {
        var currentTarget = document.querySelector(morphOptions.target);
        var newTarget = newDoc.querySelector(morphOptions.target);
        if (!currentTarget || !newTarget) return;

        var swap = morphOptions.swap;

        if (swap === "beforeend" || swap === "append") {
            while (newTarget.firstChild) {
                currentTarget.appendChild(newTarget.firstChild);
            }
        } else if (swap === "afterbegin" || swap === "prepend") {
            var existing = document.createDocumentFragment();
            while (currentTarget.firstChild) {
                existing.appendChild(currentTarget.firstChild);
            }
            while (newTarget.firstChild) {
                currentTarget.appendChild(newTarget.firstChild);
            }
            while (existing.firstChild) {
                currentTarget.appendChild(existing.firstChild);
            }
        } else if (swap === "innerHTML") {
            while (currentTarget.firstChild) {
                currentTarget.removeChild(currentTarget.firstChild);
            }
            while (newTarget.firstChild) {
                currentTarget.appendChild(newTarget.firstChild);
            }
        } else {
            Idiomorph.morph(currentTarget, newTarget, makeIdiomorphCallbacks());
        }
    }

    function reexecuteScripts(root) {
        var scripts = root
            ? root.querySelectorAll("script")
            : document.querySelectorAll("script");
        var staticPromises = [];
        var inlineScripts = [];

        scripts.forEach(function (oldScript) {
            if (oldScript.type && oldScript.type !== "text/javascript") return;
            if (oldScript.hasAttribute(STATIC_ATTR)) {
                var src = oldScript.getAttribute("src");
                if (src && !executedStaticScripts.has(src)) {
                    executedStaticScripts.add(src);
                    var newScript = document.createElement("script");
                    newScript.src = src;
                    Array.prototype.forEach.call(oldScript.attributes, function (attr) {
                        if (attr.name !== "src") newScript.setAttribute(attr.name, attr.value);
                    });
                    staticPromises.push(new Promise(function (resolve) {
                        newScript.onload = resolve;
                        newScript.onerror = resolve;
                    }));
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                }
                return;
            }
            inlineScripts.push(oldScript);
        });

        return Promise.all(staticPromises).then(function () {
            inlineScripts.forEach(function (oldScript) {
                if (!oldScript.parentNode) return;
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
        });
    }

    function abortCurrentRequest() {
        if (currentController) {
            currentController.abort();
            currentController = null;
        }
    }

    function morphFetch(url, options, isPopstate, morphOptions) {
        abortCurrentRequest();

        if (!isPopstate && (!morphOptions || !morphOptions.target)) {
            saveScrollPosition();
        }
        setLoading(true);
        startProgress();
        dispatchFetchEvent(FETCH_START_EVENT, url);

        var cached = getPrefetched(url);
        if (cached && (!options || !options.method || options.method === "GET")) {
            setLoading(false);
            finishProgress();
            morphResponse(cached.html, cached.redirectUrl || url, isPopstate, morphOptions);
            if (isPopstate) {
                var targetUrl = window.location.href.split("#")[0];
                var saved = scrollPositions[targetUrl];
                if (saved) {
                    window.scrollTo(saved.x, saved.y);
                } else {
                    window.scrollTo(0, 0);
                }
            } else if (!morphOptions || !morphOptions.target) {
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
                    return response.text().then(function (html) {
                        return { html: html, status: response.status, isError: true, redirectUrl: url };
                    }).catch(function () {
                        throw new Error("HTTP " + response.status);
                    });
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
                if (result.isError) {
                    window.dispatchEvent(new CustomEvent(ERROR_EVENT, {
                        detail: { url: url, status: result.status }
                    }));
                    if (!morphOptions || !morphOptions.target) {
                        morphResponse(result.html, result.redirectUrl, isPopstate, morphOptions);
                    }
                    return;
                }
                morphResponse(result.html, result.redirectUrl, isPopstate, morphOptions);
                if (isPopstate) {
                    var targetUrl = window.location.href.split("#")[0];
                    var saved = scrollPositions[targetUrl];
                    if (saved) {
                        window.scrollTo(saved.x, saved.y);
                    } else {
                        window.scrollTo(0, 0);
                    }
                } else if (!morphOptions || !morphOptions.target) {
                    window.scrollTo(0, 0);
                }
                dispatchFetchEvent(FETCH_END_EVENT, result.redirectUrl);
            })
            .catch(function (err) {
                currentController = null;
                if (err.name === "AbortError") return;
                window.dispatchEvent(new CustomEvent(ERROR_EVENT, {
                    detail: { url: url, error: err.message }
                }));
                if (morphOptions && morphOptions.target) {
                    setLoading(false);
                    return;
                }
                window.location.href = url;
            })
            .finally(function () {
                clearTimeout(timeoutId);
                setLoading(false);
                finishProgress();
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
        if (link.hasAttribute(TARGET_ATTR)) return;

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

    function scrollToHash(hash) {
        if (!hash || hash === "#") return false;
        var id = hash.substring(1);
        var target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({ behavior: "smooth" });
            return true;
        }
        return false;
    }

    function isSamePage(url1, url2) {
        return url1.split("#")[0] === url2.split("#")[0];
    }

    var lastPathname = window.location.pathname + window.location.search;

    document.addEventListener("click", function (e) {
        var link = e.target.closest("a[href]");
        if (!link) return;
        if (!isLocalLink(link)) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        if (shouldSkipElement(link)) return;

        if (isHashLink(link)) {
            e.preventDefault();
            var hash = link.getAttribute("href");
            history.pushState({}, "", hash);
            scrollToHash(hash);
            return;
        }

        e.preventDefault();
        var morphOptions = getMorphOptions(link);
        morphFetch(link.href, null, false, morphOptions);
    });

    document.addEventListener("submit", function (e) {
        var form = e.target;
        if (form.tagName !== "FORM") return;
        if (!isLocalForm(form)) return;

        e.preventDefault();

        var method = (form.getAttribute("method") || "GET").toUpperCase();
        var action = form.getAttribute("action") || window.location.href;
        var options = { method: method };
        var morphOptions = getMorphOptions(form);

        if (method === "GET") {
            var params = new URLSearchParams(new FormData(form)).toString();
            if (params) {
                action = action.split("?")[0] + "?" + params;
            }
        } else {
            options.body = new FormData(form);
        }

        morphFetch(action, options, false, morphOptions);
    });

    window.addEventListener("popstate", function () {
        var currentPathname = window.location.pathname + window.location.search;
        if (currentPathname === lastPathname) {
            if (!scrollToHash(window.location.hash)) {
                window.scrollTo(0, 0);
            }
            return;
        }
        lastPathname = currentPathname;
        morphFetch(window.location.href, null, true);
    });

    document.querySelectorAll("script[data-morph-static][src]").forEach(function (s) {
        executedStaticScripts.add(s.getAttribute("src"));
    });

    window.DjangoMorph = {
        navigate: function (url, morphOptions) {
            morphFetch(url, null, false, morphOptions || null);
        },
        refresh: function () {
            morphFetch(window.location.href, null, true);
        }
    };
})();
