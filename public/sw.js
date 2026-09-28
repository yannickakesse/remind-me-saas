// Service Worker — Remind Me PWA, Push Notifications & Offline Mode
const CACHE_NAME = "remindme-v1.1.0";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/badge-72x72.png",
  "/icons/favicon-32x32.png",
  "/brand/logo.jpg",
];

// 1. Installation & Pre-caching de la page hors-ligne et des assets clés
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        try {
          await cache.addAll(PRECACHE_ASSETS);
        } catch (err) {
          console.warn("[PWA SW] Pre-cache warning (some assets may be optional):", err);
        }
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activation & Cleanup des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Strategy: Navigation Offline Fallback & Cache-First Assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Intercepter les requêtes de navigation de page HTML (ex: safari, chrome, app mobile sans réseau)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        // En cas de perte ou d'absence de connexion Internet, servir la page de secours de l'application
        const cache = await caches.open(CACHE_NAME);
        const cachedOfflinePage = await cache.match(OFFLINE_URL);
        if (cachedOfflinePage) {
          return cachedOfflinePage;
        }
        // Fallback vers /offline si disponible
        const fallbackNextOffline = await cache.match("/offline");
        if (fallbackNextOffline) {
          return fallbackNextOffline;
        }
        return new Response("Hors-ligne. Veuillez vous connecter à Internet.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
    );
    return;
  }

  // Assets statiques (icônes, logos, manifest, favicon, images de marque) : Cache-first avec rafraîchissement
  const url = new URL(request.url);
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/offline.html"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          return caches.match("/icons/icon-192x192.png");
        });
      })
    );
    return;
  }

  // Ne pas bloquer les requêtes API, Server Actions ou Next.js RSC en ligne
});

// 4. Web Push Event Handler (Système de notifications Push Mobile & Desktop)
self.addEventListener("push", (event) => {
  let data = {
    title: "Remind Me",
    body: "Vous avez une nouvelle notification.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: { url: "/notifications" },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = {
        title: json.title || data.title,
        body: json.body || data.body,
        icon: json.icon || data.icon,
        badge: json.badge || data.badge,
        data: json.data || { url: json.link || "/notifications" },
      };
    } catch {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    vibrate: [100, 50, 100],
    tag: (data.data && data.data.category) || "remindme-alert",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// 5. Notification Click Handler (Routage direct vers l'entité concernée)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
