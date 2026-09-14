// Service Worker — Remind Me PWA & Push Notification Service
const CACHE_NAME = "remindme-v1.0.0";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/manifest.webmanifest",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/badge-72x72.png",
  "/icons/favicon-32x32.png",
];

// 1. Installation & Pre-caching
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 2. Activation & Cleanup of outdated caches
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

// 3. Fetch strategy: Network-first for dynamic routes, Cache-first for static icons
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non GET et les appels API/Supabase/Auth directs
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Pour les icônes et assets statiques: Cache-First avec fallback Network
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // Pour les pages de navigation: Network-First avec fallback Cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cached) => {
        return cached || caches.match("/dashboard");
      });
    })
  );
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
      // Si une fenêtre est déjà ouverte sur le domaine, la focaliser et naviguer
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre vers l'URL cible
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
