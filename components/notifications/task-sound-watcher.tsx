"use client";

import { useEffect, useRef } from "react";
import { playNotificationChime, isSoundEnabled } from "@/lib/notifications/sound";
import {
  initVoiceEngine,
  unlockVoiceAudio,
  playVoiceReminder,
  generateVoiceMessage,
  getLocalVoiceSettings,
  saveLocalVoiceSettings,
} from "@/lib/voice";
import { useToast } from "@/components/ui/toast";

interface TaskSoundWatcherProps {
  userId?: string;
}

const STORAGE_KEY = "remindme_alerted_notif_ids";
const CHANNEL_NAME = "remindme_notif_channel";

function getStoredAlertedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function saveStoredAlertedIds(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(set).slice(-500);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

export function TaskSoundWatcher({ userId }: TaskSoundWatcherProps) {
  const { push } = useToast();
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const mountTimestampRef = useRef<number>(Date.now());
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    alertedIdsRef.current = getStoredAlertedIds();
    mountTimestampRef.current = Date.now();

    // BroadcastChannel pour synchronisation inter-onglets
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event.data?.type === "ALERTED_IDS" && Array.isArray(event.data.ids)) {
            event.data.ids.forEach((id: string) => alertedIdsRef.current.add(id));
            saveStoredAlertedIds(alertedIdsRef.current);
          }
        };
        channelRef.current = bc;
      } catch {}
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, []);

  // 1. Déverrouillage automatique de l'Audio & Synthèse Vocale au premier geste utilisateur
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

  // 2. Écoute des messages du Service Worker (Push en arrière-plan)
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

        if (textToSpeak && voiceAllowed && localSettings.voice_reminders && !isSpeakingRef.current) {
          isSpeakingRef.current = true;
          playVoiceReminder({
            text: textToSpeak,
            language: localSettings.voice_language,
            voiceType: localSettings.voice_type,
            repeat: localSettings.repeat_voice,
            onEnd: () => { isSpeakingRef.current = false; },
            onError: () => { isSpeakingRef.current = false; },
          }).catch(() => {
            isSpeakingRef.current = false;
          });
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
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, "", newUrl);

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

            if (voiceSettings.voice_reminders && firstUnread.metadata?.voice_reminder_enabled !== false && !isSpeakingRef.current) {
              isSpeakingRef.current = true;
              setTimeout(() => {
                playVoiceReminder({
                  text: textToSpeak,
                  language: voiceSettings.voice_language,
                  voiceType: voiceSettings.voice_type,
                  repeat: voiceSettings.repeat_voice,
                  onEnd: () => { isSpeakingRef.current = false; },
                  onError: () => { isSpeakingRef.current = false; },
                }).catch(() => {
                  isSpeakingRef.current = false;
                });
              }, 600);
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
          created_at?: string;
          metadata?: Record<string, any>;
        }> = data.unread || [];

        const voicePrefs = data.voicePrefs || getLocalVoiceSettings();
        if (data.voicePrefs) {
          saveLocalVoiceSettings(data.voicePrefs);
        }

        // Premier chargement : enregistrer TOUS les IDs existants pour éviter une rafale au démarrage
        if (initialLoadRef.current) {
          unreadList.forEach((n) => alertedIdsRef.current.add(n.id));
          saveStoredAlertedIds(alertedIdsRef.current);
          initialLoadRef.current = false;
          return;
        }

        const now = Date.now();
        const newlyAlerted: string[] = [];

        // Détection des nouveaux rappels non encore alertés
        for (const item of unreadList) {
          if (!alertedIdsRef.current.has(item.id)) {
            alertedIdsRef.current.add(item.id);
            newlyAlerted.push(item.id);

            // Vérification de fraîcheur : ne pas jouer de son/voix pour des notifications anciennes (> 3 min)
            const itemCreatedAt = item.created_at ? new Date(item.created_at).getTime() : now;
            const isFresh = now - itemCreatedAt < 3 * 60 * 1000 || itemCreatedAt >= mountTimestampRef.current;

            if (isFresh) {
              const isVoiceEnabled = voicePrefs.voice_reminders;
              const isActivityVoiceAllowed = item.metadata?.voice_reminder_enabled !== false;

              // 1. Synthèse Vocale si disponible et non occupée
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
                playVoiceReminder({
                  text: voiceScript,
                  language: voicePrefs.voice_language,
                  voiceType: voicePrefs.voice_type,
                  repeat: voicePrefs.repeat_voice,
                  onEnd: () => { isSpeakingRef.current = false; },
                  onError: () => { isSpeakingRef.current = false; },
                }).catch(() => {
                  isSpeakingRef.current = false;
                });
              } else if (isSoundEnabled()) {
                playNotificationChime(0.4);
              }

              // 2. Notification Toast visuelle
              push(
                `🔔 ${item.title} : ${item.body}`,
                item.kind?.includes("overdue") ? "error" : "info"
              );

              // 3. Notification native du système si autorisée
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                try {
                  new Notification(item.title, {
                    body: item.body,
                    icon: "/icons/icon-192x192.png",
                  });
                } catch {}
              }
            }
          }
        }

        if (newlyAlerted.length > 0) {
          saveStoredAlertedIds(alertedIdsRef.current);
          if (channelRef.current) {
            channelRef.current.postMessage({ type: "ALERTED_IDS", ids: newlyAlerted });
          }
        }
      } catch (err) {
        // Silencieux en cas de micro-coupure réseau
      }
    }

    // Premier appel après 3s
    const timeout = setTimeout(checkReminders, 3000);
    // Polling toutes les 30s
    const interval = setInterval(checkReminders, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [userId, push]);

  return null;
}
