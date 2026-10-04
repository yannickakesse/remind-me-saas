// Service Worker — Remind Me PWA, Push Notifications & Offline Mode
const CACHE_NAME = "remindme-v1.3.0";
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
  "/images/backgrounds/dashboard-bg.jpg",
  "/images/backgrounds/drawer-bg.jpg",
  "/images/backgrounds/activities-bg.jpg",
  "/images/backgrounds/tasks-bg.jpg",
  "/images/backgrounds/tasks-upcoming-bg.jpg",
  "/images/backgrounds/tasks-today-bg.jpg",
  "/images/backgrounds/finances-overview-bg.jpg",
  "/images/backgrounds/expenses-bg.jpg",
  "/images/backgrounds/scheduled-expenses-bg.jpg",
  "/images/backgrounds/savings-bg.jpg",
  "/images/backgrounds/cancelled-expenses-bg.jpg",
  "/images/backgrounds/clients-call-bg.jpg",
  "/images/backgrounds/contacts-bg.jpg",
  "/images/backgrounds/reports-bg.jpg",
  "/images/backgrounds/notifications-bg.jpg",
  "/images/backgrounds/settings-bg.jpg",
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

  // Assets statiques (icônes, logos, manifest, favicon, images de fond) : Cache-first avec rafraîchissement
  const url = new URL(request.url);
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/images/backgrounds/") ||
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

// 4. Web Push Event Handler (Système de notifications Push Mobile & Desktop avec Rappels Vocaux)
self.addEventListener("push", (event) => {
  let data = {
    title: "Remind Me",
    body: "Vous avez une nouvelle notification.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: { url: "/notifications", voice_text: null, voice_reminder_enabled: true },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = {
        title: json.title || data.title,
        body: json.body || data.body,
        icon: json.icon || data.icon,
        badge: json.badge || data.badge,
        data: json.data || {
          url: json.link || "/notifications",
          voice_text: json.voice_text || null,
          voice_reminder_enabled: json.voice_reminder_enabled !== false,
        },
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
    vibrate: [200, 100, 200, 100, 200],
    tag: (data.data && data.data.category) || "remindme-alert",
    renotify: true,
    actions: [
      { action: "listen", title: "🔊 Écouter" },
      { action: "open", title: "Ouvrir" },
    ],
  };

  // Notifier tous les onglets / PWA ouverts en arrière-plan pour lecture vocale immédiate
  const broadcastPromise = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((windowClients) => {
      for (const client of windowClients) {
        client.postMessage({
          type: "REMINDME_VOICE_NOTIFICATION",
          payload: {
            title: data.title,
            body: data.body,
            voice_text: data.data?.voice_text,
            voice_reminder_enabled: data.data?.voice_reminder_enabled !== false,
            data: data.data,
          },
        });
      }
    });

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, notificationOptions),
      broadcastPromise,
    ])
  );
});

// 5. Notification Click Handler (Déverrouillage téléphone & lecture vocale immédiate)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const baseUrl = (event.notification.data && event.notification.data.url) || "/notifications";
  const hasVoice = Boolean(event.notification.data && event.notification.data.voice_text);
  const isActionListen = event.action === "listen";

  const targetUrl = hasVoice || isActionListen
    ? (baseUrl.includes("?") ? `${baseUrl}&speak_voice=1` : `${baseUrl}?speak_voice=1`)
    : baseUrl;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          if (hasVoice) {
            client.postMessage({
              type: "REMINDME_TRIGGER_VOICE_SPEAK",
              voice_text: event.notification.data.voice_text,
            });
          }
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
