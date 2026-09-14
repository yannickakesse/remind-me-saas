"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Enregistrement différé au chargement pour ne jamais bloquer le rendu critique
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            console.debug("[PWA] Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.debug("[PWA] Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
