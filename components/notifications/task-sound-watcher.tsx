"use client";

import { useEffect, useRef } from "react";
import { playNotificationChime, isSoundEnabled } from "@/lib/notifications/sound";
import {
  initVoiceEngine,
  unlockVoiceAudio,
  speakVoiceReminder,
  generateVoiceMessage,
  getLocalVoiceSettings,
  saveLocalVoiceSettings,
} from "@/lib/voice";
import { useToast } from "@/components/ui/toast";

interface TaskSoundWatcherProps {
  userId?: string;
}

export function TaskSoundWatcher({ userId }: TaskSoundWatcherProps) {
  const { push } = useToast();
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const isSpeakingRef = useRef(false);

  // 1. Déverrouillage automatique de l'Audio & de la Synthèse Vocale au premier geste utilisateur
  useEffect(() => {
    initVoiceEngine();

    function handleFirstUserInteraction() {
      unlockVoiceAudio();
      window.removeEventListener("click", handleFirstUserInteraction);
      window.removeEventListener("keydown", handleFirstUserInteraction);
      window.removeEventListener("touchstart", handleFirstUserInteraction);
    }

    window.addEventListener("click", handleFirstUserInteraction, { once: true });
    window.addEventListener("keydown", handleFirstUserInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstUserInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstUserInteraction);
      window.removeEventListener("keydown", handleFirstUserInteraction);
      window.removeEventListener("touchstart", handleFirstUserInteraction);
    };
  }, []);

  // 2. Écoute des messages du Service Worker (Push en arrière-plan & Clic notification depuis écran verrouillé)
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    function handleServiceWorkerMessage(event: MessageEvent) {
      if (!event.data) return;

      const { type, payload, voice_text } = event.data;

      if (type === "REMINDME_VOICE_NOTIFICATION" || type === "REMINDME_TRIGGER_VOICE_SPEAK") {
        const textToSpeak =
          voice_text ||
          payload?.voice_text ||
          (payload?.title ? `${payload.title}. ${payload.body || ""}` : null);

        const voiceAllowed = payload?.voice_reminder_enabled !== false;
        const localSettings = getLocalVoiceSettings();

        if (textToSpeak && voiceAllowed && localSettings.voice_reminders) {
          speakVoiceReminder({
            text: textToSpeak,
            language: localSettings.voice_language,
            voiceType: localSettings.voice_type,
            repeat: localSettings.repeat_voice,
          }).catch(() => {});
        }
      }
    }

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  // 3. Déclenchement automatique si l'utilisateur ouvre l'application depuis une notification push (?speak_voice=1)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("speak_voice") === "1") {
      // Nettoyer l'URL pour ne pas répéter la lecture au rafraîchissement
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, "", newUrl);

      // Récupérer rapidement les alertes non lues pour lire la plus récente
      fetch("/api/notifications/poll", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          const firstUnread = data.unread?.[0];
          if (firstUnread) {
            const voiceSettings = data.voicePrefs || getLocalVoiceSettings();
            const textToSpeak =
              firstUnread.metadata?.voice_text ||
              generateVoiceMessage({
                userName: data.userName,
                activityTitle: firstUnread.title,
                category: firstUnread.category,
                language: voiceSettings.voice_language,
              });

            if (voiceSettings.voice_reminders && firstUnread.metadata?.voice_reminder_enabled !== false) {
              setTimeout(() => {
                speakVoiceReminder({
                  text: textToSpeak,
                  language: voiceSettings.voice_language,
                  voiceType: voiceSettings.voice_type,
                  repeat: voiceSettings.repeat_voice,
                }).catch(() => {});
              }, 500);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // 4. Surveillance périodique intelligente des rappels (Application ouverte / en avant-plan)
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
          metadata?: Record<string, any>;
        }> = data.unread || [];

        const voicePrefs = data.voicePrefs || getLocalVoiceSettings();
        if (data.voicePrefs) {
          saveLocalVoiceSettings(data.voicePrefs);
        }

        if (initialLoadRef.current) {
          // Premier chargement : enregistrer les IDs existants pour éviter une rafale au démarrage
          unreadList.forEach((n) => alertedIdsRef.current.add(n.id));
          initialLoadRef.current = false;
          return;
        }

        // Détection des nouveaux rappels non encore alertés
        for (const item of unreadList) {
          if (!alertedIdsRef.current.has(item.id)) {
            alertedIdsRef.current.add(item.id);

            const isVoiceEnabled = voicePrefs.voice_reminders;
            const isActivityVoiceAllowed = item.metadata?.voice_reminder_enabled !== false;

            // 1. Génération & Synthèse Vocale Native (Text-to-Speech)
            if (isVoiceEnabled && isActivityVoiceAllowed && !isSpeakingRef.current) {
              const voiceScript =
                item.metadata?.voice_text ||
                generateVoiceMessage({
                  userName: data.userName,
                  activityTitle: item.title,
                  category: item.category,
                  language: voicePrefs.voice_language,
                });

              isSpeakingRef.current = true;
              speakVoiceReminder({
                text: voiceScript,
                language: voicePrefs.voice_language,
                voiceType: voicePrefs.voice_type,
                repeat: voicePrefs.repeat_voice,
                onEnd: () => {
                  isSpeakingRef.current = false;
                },
                onError: () => {
                  isSpeakingRef.current = false;
                },
              }).catch(() => {
                isSpeakingRef.current = false;
              });
            } else if (isSoundEnabled()) {
              // Si la voix n'est pas activée ou déjà occupée, jouer le carillon sonore Remind Me
              playNotificationChime(0.4);
            }

            // 2. Afficher la notification Toast visuelle
            push(
              `🔔 ${item.title} : ${item.body}`,
              item.kind?.includes("overdue") ? "error" : "info"
            );

            // 3. Déclencher la notification native du système si autorisée
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
        // Silencieux en cas de déconnexion réseau temporaire
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
