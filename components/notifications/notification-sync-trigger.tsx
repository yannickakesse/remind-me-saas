"use client";

import { useEffect } from "react";

const LAST_SYNC_KEY = "remindme_last_notif_sync";
const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function NotificationSyncTrigger() {
  useEffect(() => {
    // Vérification du délai de synchronisation pour éviter les appels excessifs
    const lastSync = sessionStorage.getItem(LAST_SYNC_KEY);
    const now = Date.now();

    if (lastSync && now - parseInt(lastSync, 10) < SYNC_INTERVAL_MS) {
      return;
    }

    // Exécution différée en arrière-plan lorsque le thread principal est totalement libre
    const timeoutId = setTimeout(() => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => {
          fetch("/api/notifications/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
            .then(() => {
              sessionStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
            })
            .catch((err) => {
              console.debug("[SyncTrigger] Background sync silent failure:", err);
            });
        });
      } else {
        fetch("/api/notifications/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
          .then(() => {
            sessionStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
          })
          .catch((err) => {
            console.debug("[SyncTrigger] Background sync silent failure:", err);
          });
      }
    }, 8000); // 8 secondes après le chargement pour garantir une réactivité immédiate

    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
