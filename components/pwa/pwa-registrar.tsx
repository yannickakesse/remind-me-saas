"use client";

import { useEffect } from "react";
import { subscribeToPushReliably } from "@/lib/push/client";


/**
 * Composant client invisible de haut niveau qui enregistre automatiquement
 * le Service Worker (/sw.js) et synchronise la souscription Web Push & iOS PWA.
 */
export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    async function initPwaAndPush() {
      try {
        // 1. Enregistrement automatique du Service Worker à l'échelle de l'application
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // 2. Si la permission de notification est déjà accordée, synchroniser la souscription avec le serveur
        if ("Notification" in window && Notification.permission === "granted" && "PushManager" in window) {
          // Abonnement avec la clé du serveur ; un ancien abonnement (autre clé) est remplacé automatiquement
          let sub: PushSubscription | null = null;
          try {
            sub = await subscribeToPushReliably();
          } catch (subErr) {
            console.debug("[PwaRegistrar] Subscription creation fallback:", subErr);
          }

          if (sub) {
            const rawSub = sub.toJSON();
            if (rawSub.endpoint && rawSub.keys) {
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  endpoint: rawSub.endpoint,
                  keys: {
                    p256dh: rawSub.keys.p256dh,
                    auth: rawSub.keys.auth,
                  },
                  platform: navigator.platform || "Web",
                  browser: navigator.userAgent,
                  device_name: window.innerWidth < 768 ? "Mobile/iPhone" : "Desktop",
                }),
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.debug("[PwaRegistrar] Silent SW registration init:", err);
      }
    }

    initPwaAndPush();
  }, []);

  return null;
}
