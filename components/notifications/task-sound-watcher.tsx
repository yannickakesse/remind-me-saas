"use client";

import { useEffect, useRef } from "react";
import { playNotificationChime, isSoundEnabled } from "@/lib/notifications/sound";
import { useToast } from "@/components/ui/toast";

interface TaskSoundWatcherProps {
  userId?: string;
}

export function TaskSoundWatcher({ userId }: TaskSoundWatcherProps) {
  const { push } = useToast();
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Déverrouillage automatique de l'audio au premier clic de l'utilisateur
  useEffect(() => {
    function unlockAudio() {
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = new AudioCtxClass();
          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
          }
        }
      } catch {}
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    }

    window.addEventListener("click", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // Surveillance périodique des notifications et rappels de tâches
  useEffect(() => {
    if (!userId) return;

    async function checkReminders() {
      try {
        const res = await fetch("/api/notifications/poll", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        const unreadList: Array<{
          id: string;
          title: string;
          body: string;
          category?: string;
          kind?: string;
          link?: string;
        }> = data.unread || [];

        if (initialLoadRef.current) {
          // Premier chargement : on enregistre les notifications existantes pour ne pas sonner en rafale
          unreadList.forEach((n) => alertedIdsRef.current.add(n.id));
          initialLoadRef.current = false;
          return;
        }

        // Détection des nouveaux rappels non alertés
        for (const item of unreadList) {
          if (!alertedIdsRef.current.has(item.id)) {
            alertedIdsRef.current.add(item.id);

            // 1. Jouer la sonnerie Remind Me
            if (isSoundEnabled()) {
              playNotificationChime(0.4);
            }

            // 2. Afficher la notification Toast visuelle
            push(
              `🔔 ${item.title} : ${item.body}`,
              item.kind?.includes("overdue") ? "error" : "info"
            );

            // 3. Déclencher la notification native du navigateur si autorisée
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification(item.title, {
                  body: item.body,
                  icon: "/icons/icon-192.png",
                });
              } catch {}
            }
          }
        }
      } catch (err) {
        // Silencieux en cas de réseau temporairement indisponible
      }
    }

    // Premier appel rapide après 3 secondes
    const timeout = setTimeout(checkReminders, 3000);
    // Puis vérification toutes les 30 secondes
    const interval = setInterval(checkReminders, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [userId, push]);

  return null;
}
