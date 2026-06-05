const CACHE_VERSION = "reportflow-v6";
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_HTML_URL = "/index.html";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.png",
  "/iconos/escudo-dim.png",
  "/iconos/escudo-dim2.png",
];

const isSameOrigin = (requestUrl) => {
  const url = new URL(requestUrl);
  return url.origin === self.location.origin;
};

const isNavigationRequest = (request) => request.mode === "navigate";

const isStaticAssetRequest = (request) => {
  if (request.method !== "GET" || !isSameOrigin(request.url)) {
    return false;
  }

  const url = new URL(request.url);
  return (
    url.pathname.startsWith("/_expo/") ||
    url.pathname.startsWith("/assets/") ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "manifest"
  );
};

const canCacheResponse = (response) => {
  return Boolean(response) && response.ok && (response.type === "basic" || response.type === "default");
};

const cacheResponse = async (cacheName, request, response) => {
  if (!canCacheResponse(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
};

const precacheIndividually = async () => {
  const cache = await caches.open(APP_SHELL_CACHE);

  await Promise.all(
    PRECACHE_URLS.map(async (assetUrl) => {
      try {
        const request = new Request(assetUrl, { cache: "reload" });
        const response = await fetch(request);
        if (canCacheResponse(response)) {
          await cache.put(assetUrl, response.clone());
          console.info("[SW] Precache ok", { assetUrl });
          return;
        }

        console.warn("[SW] Precache omitido por respuesta no cacheable", {
          assetUrl,
          status: response.status,
        });
      } catch (error) {
        console.warn("[SW] Precache omitido por error", { assetUrl, error });
      }
    })
  );
};

const getOfflineDocument = async () => {
  const cache = await caches.open(APP_SHELL_CACHE);
  const cachedIndex = await cache.match(OFFLINE_HTML_URL);
  if (cachedIndex) return cachedIndex;

  const cachedRoot = await cache.match("/");
  if (cachedRoot) return cachedRoot;

  return new Response(
    "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Offline</title></head><body>Offline</body></html>",
    {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(precacheIndividually());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com")
  ) {
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          await cacheResponse(APP_SHELL_CACHE, OFFLINE_HTML_URL, networkResponse);
          return networkResponse;
        } catch (error) {
          console.info("[SW] Navegacion offline; usando app shell cacheado", {
            url: request.url,
            error,
          });
          return getOfflineDocument();
        }
      })()
    );
    return;
  }

  if (isStaticAssetRequest(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          event.waitUntil(
            fetch(request)
              .then((networkResponse) => cacheResponse(RUNTIME_CACHE, request, networkResponse))
              .catch((error) => {
                console.info("[SW] Revalidacion de asset omitida por red", {
                  url: request.url,
                  error,
                });
              })
          );

          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          await cacheResponse(RUNTIME_CACHE, request, networkResponse);
          return networkResponse;
        } catch (error) {
          console.warn("[SW] Asset no disponible en red ni cache", {
            url: request.url,
            error,
          });
          return new Response("", {
            status: 503,
            statusText: "Offline asset unavailable",
          });
        }
      })()
    );
  }
});
