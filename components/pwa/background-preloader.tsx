"use client";

import { useEffect } from "react";

const BACKGROUND_IMAGES = [
  "/images/backgrounds/dashboard-bg.jpg",
  "/images/backgrounds/drawer-bg.jpg",
  "/images/backgrounds/activities-bg.jpg",
  "/images/backgrounds/tasks-bg.jpg",
  "/images/backgrounds/tasks-overdue-bg.jpg",
  "/images/backgrounds/tasks-today-bg.jpg",
  "/images/backgrounds/tasks-upcoming-bg.jpg",
  "/images/backgrounds/tasks-nodate-bg.jpg",
  "/images/backgrounds/tasks-completed-bg.jpg",
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

export function BackgroundPreloader() {
  useEffect(() => {
    // Préchargement immédiat en mémoire dès le montage pour affichage à 0ms
    if (typeof window === "undefined") return;

    // 1. Précharger avec new Image()
    BACKGROUND_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    // 2. Précharger dans le Cache Storage du Service Worker si disponible
    if ("caches" in window) {
      caches.open("remindme-v1.1.0").then((cache) => {
        cache.addAll(BACKGROUND_IMAGES).catch(() => {
          // Ignorer si déjà en cache
        });
      });
    }
  }, []);

  return (
    <div className="hidden pointer-events-none" aria-hidden="true">
      {BACKGROUND_IMAGES.map((src) => (
        <link key={src} rel="preload" as="image" href={src} />
      ))}
    </div>
  );
}
