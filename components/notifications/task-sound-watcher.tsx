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
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
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
          if (event.data?.type === "VOICE_PLAYING" && event.data.id) {
            alertedIdsRef.current.add(event.data.id);
            saveStoredAlertedIds(alertedIdsRef.current);
            isSpeakingRef.current = true;
          }
          if (event.data?.type === "VOICE_ENDED" || event.data?.type === "VOICE_STOP") {
            isSpeakingRef.current = false;
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
      const voiceMsgFromUrl = urlParams.get("voice_msg");
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, "", newUrl);

      const localSettings = getLocalVoiceSettings();

      if (voiceMsgFromUrl && localSettings.voice_reminders && !isSpeakingRef.current) {
        // Exécution vocale synchrone immédiate (Conserve le geste utilisateur mobile sans délai)
        isSpeakingRef.current = true;
        playVoiceReminder({
          text: decodeURIComponent(voiceMsgFromUrl),
          language: localSettings.voice_language,
          voiceType: localSettings.voice_type,
          repeat: localSettings.repeat_voice,
          onEnd: () => { isSpeakingRef.current = false; },
          onError: () => { isSpeakingRef.current = false; },
        }).catch(() => {
          isSpeakingRef.current = false;
        });
      } else {
        // Fallback si voice_msg n'était pas dans l'URL
        fetch("/api/notifications/poll", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            const firstUnread = data.unread?.[0];
            if (firstUnread) {
              const voiceSettings = data.voicePrefs || localSettings;
              const textToSpeak =
                firstUnread.metadata?.voice_text ||
                generateVoiceMessage({
                  userName: data.userName,
                  activityTitle: firstUnread.title,
                  category: firstUnread.category,
                  language: voiceSettings.voice_language,
                  hideAmount: voiceSettings.voice_hide_financial_amounts,
                  includeUserName: voiceSettings.voice_include_user_name,
                });

              if (voiceSettings.voice_reminders && firstUnread.metadata?.voice_reminder_enabled !== false && !isSpeakingRef.current) {
                isSpeakingRef.current = true;
                playVoiceReminder({
                  text: textToSpeak,
                  language: voiceSettings.voice_language,
                  voiceType: voiceSettings.voice_type,
                  repeat: voiceSettings.repeat_voice,
                  rate: voiceSettings.voice_playback_rate || 1.0,
                  onEnd: () => { isSpeakingRef.current = false; },
                  onError: () => { isSpeakingRef.current = false; },
                }).catch(() => {
                  isSpeakingRef.current = false;
                });
              }
            }
          })
          .catch(() => {});
      }
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

        // Premier chargement : marquer les notifications obsolètes comme déjà alertées pour éviter une rafale,
        // mais conserver les rappels d'activité récents (< 15 min) pour les annoncer dès l'ouverture !
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          const currentTimestamp = Date.now();
          unreadList.forEach((n) => {
            const itemCreatedAt = n.created_at ? new Date(n.created_at).getTime() : 0;
            const isActivityReminder = n.category === "activity" || n.kind?.includes("reminder");
            const maxAgeMs = isActivityReminder ? 15 * 60 * 1000 : 3 * 60 * 1000;
            if (currentTimestamp - itemCreatedAt > maxAgeMs) {
              alertedIdsRef.current.add(n.id);
            }
          });
          saveStoredAlertedIds(alertedIdsRef.current);
        }

        const now = Date.now();
        const newlyAlerted: string[] = [];

        // Détection des nouveaux rappels non encore alertés
        for (const item of unreadList) {
          if (!alertedIdsRef.current.has(item.id)) {
            alertedIdsRef.current.add(item.id);
            newlyAlerted.push(item.id);

            // Vérification de fraîcheur : 15 min pour les rappels d'activité réels, 3 min pour les alertes générales
            const itemCreatedAt = item.created_at ? new Date(item.created_at).getTime() : now;
            const isActivityReminder = item.category === "activity" || item.kind?.includes("reminder");
            const maxFreshMs = isActivityReminder ? 15 * 60 * 1000 : 3 * 60 * 1000;
            const isFresh = now - itemCreatedAt < maxFreshMs || itemCreatedAt >= mountTimestampRef.current;

            if (isFresh) {
              const isVoiceEnabled = voicePrefs.voice_reminders;
              const isActivityVoiceAllowed = item.metadata?.voice_reminder_enabled !== false;

              // Filtrage fin par catégorie autorisée
              let isCategoryAllowed = true;
              if (item.category === "activity" || item.kind?.includes("activity")) {
                isCategoryAllowed = voicePrefs.voice_category_activities !== false;
              } else if (item.category === "task" || item.kind?.includes("task")) {
                isCategoryAllowed = voicePrefs.voice_category_tasks !== false;
              } else if (
                item.category === "payment" ||
                item.category === "expense" ||
                item.category === "finance" ||
                item.kind?.includes("payment") ||
                item.kind?.includes("expense")
              ) {
                isCategoryAllowed = voicePrefs.voice_category_finances !== false;
              } else if (
                item.kind?.includes("briefing") ||
                item.kind?.includes("summary") ||
                item.kind?.includes("checkin")
              ) {
                isCategoryAllowed = voicePrefs.voice_category_briefings !== false;
              }

              const voicePriority = item.kind?.includes("now") ? "critical" : "high";

              // 1. Synthèse Vocale si disponible, autorisée pour la catégorie et non occupée
              const isOtherTabSpeaking = typeof window !== "undefined" && Date.now() < Number(localStorage.getItem("remindme_voice_active_until") || 0);

              if (isVoiceEnabled && isActivityVoiceAllowed && isCategoryAllowed && !isSpeakingRef.current && !isOtherTabSpeaking) {
                // Si masquage financier actif, forcer la régénération propre sans montant
                const isFinancialItem = item.category === "payment" || item.category === "expense" || item.category === "finance" || item.kind?.includes("payment") || item.kind?.includes("expense");
                const shouldRegenerate = (isFinancialItem && voicePrefs.voice_hide_financial_amounts) || voicePrefs.voice_include_user_name === false;

                const voiceScript =
                  (!shouldRegenerate && item.metadata?.voice_text)
                    ? item.metadata.voice_text
                    : generateVoiceMessage({
                        userName: data.userName,
                        activityTitle: item.title,
                        category: item.category,
                        amount: item.metadata?.amount,
                        currency: item.metadata?.currency,
                        daysDiff: item.metadata?.days,
                        language: voicePrefs.voice_language,
                        hideAmount: voicePrefs.voice_hide_financial_amounts,
                        includeUserName: voicePrefs.voice_include_user_name,
                      });

                isSpeakingRef.current = true;
                const lockDurationMs = (Number(voicePrefs.repeat_voice || 0) + 1) * 12000;
                localStorage.setItem("remindme_voice_active_until", String(Date.now() + lockDurationMs));
                if (channelRef.current) {
                  channelRef.current.postMessage({ type: "VOICE_PLAYING", id: item.id });
                }

                console.debug(`[TaskSoundWatcher] 🔊 Lecture vocale lancée pour « ${item.title} » (Priorité: ${voicePriority})`);

                const onSpeechDone = () => {
                  isSpeakingRef.current = false;
                  localStorage.removeItem("remindme_voice_active_until");
                  if (channelRef.current) {
                    channelRef.current.postMessage({ type: "VOICE_ENDED", id: item.id });
                  }
                };

                playVoiceReminder({
                  text: voiceScript,
                  language: voicePrefs.voice_language,
                  voiceType: voicePrefs.voice_type,
                  priority: voicePriority,
                  repeat: voicePrefs.repeat_voice,
                  rate: voicePrefs.voice_playback_rate || 1.0,
                  onEnd: onSpeechDone,
                  onError: (err) => {
                    console.warn(`[TaskSoundWatcher] ⚠️ Erreur audio pour « ${item.title} »:`, err);
                    onSpeechDone();
                  },
                }).catch(() => {
                  onSpeechDone();
                });
              } else if (isSoundEnabled()) {
                playNotificationChime(0.4);
              }

              // 2. Notification visuelle dans la barre d'alerte (ne disparaît pas automatiquement)
              push(item.body || item.title, {
                title: item.title,
                variant: item.kind?.includes("overdue") ? "error" : "info",
                durationMs: 0, // Ne disparaît pas tout seul : reste affiché jusqu'à action ou fermeture
                action: {
                  label: "Lu",
                  onClick: async () => {
                    try {
                      await fetch("/api/notifications/quick-action", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "mark_read", notificationId: item.id }),
                      });
                    } catch {}
                  },
                },
              });

              // 3. Notification native du système si autorisée (ne disparaît pas de la barre)
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                try {
                  new Notification(item.title, {
                    body: item.body,
                    icon: "/icons/icon-192x192.png",
                    requireInteraction: true, // Reste affiché dans la barre de notifications système
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

    // Premier appel rapide après 1.2s
    const timeout = setTimeout(checkReminders, 1200);
    // Polling toutes les 30s
    const interval = setInterval(checkReminders, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [userId, push]);

  return null;
}
