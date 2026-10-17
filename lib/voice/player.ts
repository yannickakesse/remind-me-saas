import type { VoiceSpeakOptions, VoicePriority } from "./types";
import { speakVoiceReminder, stopSpeaking, isSpeechSynthesizing } from "./tts";
import { playNotificationChime } from "@/lib/notifications/sound";

let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioBlobUrl: string | null = null;
let currentPlayingPriority: VoicePriority | null = null;
let repeatTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isPlaybackStopped = false;
let currentPlaybackSessionId = 0;
let currentAbortController: AbortController | null = null;

const VOICE_CHANNEL_NAME = "remindme_notif_channel";

function notifyBroadcastStop() {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const bc = new BroadcastChannel(VOICE_CHANNEL_NAME);
      bc.postMessage({ type: "VOICE_STOP" });
      bc.close();
    } catch {}
  }
}

const PRIORITY_LEVELS: Record<VoicePriority, number> = {
  greeting: 0,
  section: 1,
  routine: 2,
  tour: 3,
  preview: 4,
  normal: 4,
  high: 5,
  critical: 6,
};

/**
 * Vérifie si une lecture vocale est actuellement en cours (MP3 ou SpeechSynthesis).
 */
export function isVoicePlaying(): boolean {
  return activeAudioElement !== null || isSpeechSynthesizing();
}

/**
 * Retourne la priorité du message vocal en cours de lecture.
 */
export function getCurrentVoicePriority(): VoicePriority | null {
  return currentPlayingPriority;
}

/**
 * Arrête immédiatement toute lecture audio en cours (ElevenLabs MP3 ou SpeechSynthesis).
 */
export function stopVoiceReminder(broadcast = true): void {
  isPlaybackStopped = true;
  currentPlaybackSessionId++;
  currentPlayingPriority = null;

  if (currentAbortController) {
    try {
      currentAbortController.abort();
    } catch {}
    currentAbortController = null;
  }

  if (repeatTimeoutId) {
    clearTimeout(repeatTimeoutId);
    repeatTimeoutId = null;
  }

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
    activeAudioElement = null;
  }

  if (activeAudioBlobUrl) {
    try {
      URL.revokeObjectURL(activeAudioBlobUrl);
    } catch {}
    activeAudioBlobUrl = null;
  }

  stopSpeaking();

  if (broadcast) {
    notifyBroadcastStop();
  }
}

/**
 * Lecteur Audio Hybride Intelligent de Remind Me.
 *
 * HIÉRARCHIE DE LECTURE (ZERO-REGRESSION) :
 * 1. PRIORITÉ 1 ➔ Fichier MP3 Haute Fidélité ElevenLabs (Yannick, Catherine, Déborah, Martina)
 * 2. FALLBACK 1  ➔ Synthèse vocale native SpeechSynthesis (lib/voice/tts.ts)
 * 3. FALLBACK 2  ➔ Carillon sonore officiel Remind Me (Web Audio API)
 *
 * Gère automatiquement :
 * - Les conflits et priorités audio (greeting, routine, normal, high, critical)
 * - Les répétitions vocales (repeat_voice: 0, 1, 2)
 * - La vitesse de diction (rate: 0.7 - 1.5)
 * - Le volume (volume: 0.0 - 1.0)
 * - Les événements de début, fin et erreurs
 */
export async function playVoiceReminder(options: VoiceSpeakOptions): Promise<boolean> {
  const {
    text,
    language = "fr",
    voiceType = "system",
    priority = "normal",
    repeat = 0,
    rate = 1.0,
    volume = 1.0,
    onStart,
    onEnd,
    onError,
  } = options;

  if (!text || !text.trim()) {
    return false;
  }

  // 0. Protection contre superposition avec la vidéo Motion Design d'introduction
  if (
    typeof window !== "undefined" &&
    (window as any).__REMINDME_VIDEO_PLAYING &&
    priority !== "critical"
  ) {
    console.debug("[VoicePlayer] Message vocal différé : la vidéo d'introduction est en cours de lecture.");
    return false;
  }

  // 0b. Arbitrage de priorité audio (Évite les chevauchements et protège les rappels urgents)
  if (isVoicePlaying()) {
    // Règle stricte : L'accueil vocal et les guides de section ne doivent JAMAIS interrompre un rappel ou un tour en cours
    if (priority === "greeting" || priority === "section") {
      console.debug(`[VoicePlayer] Annonce '${priority}' ignorée : une lecture vocale est déjà en cours.`);
      return false;
    }

    const incomingLevel = PRIORITY_LEVELS[priority] ?? 2;
    const currentLevel = currentPlayingPriority ? (PRIORITY_LEVELS[currentPlayingPriority] ?? 2) : 2;

    if (incomingLevel < currentLevel) {
      console.debug(`[VoicePlayer] Message ignoré (priorité ${priority} inférieure à ${currentPlayingPriority}).`);
      return false;
    }
  }

  // Interrompre toute lecture précédente et allouer un identifiant de session unique
  stopVoiceReminder(false);
  isPlaybackStopped = false;
  currentPlayingPriority = priority;
  const sessionId = ++currentPlaybackSessionId;
  const abortController = new AbortController();
  currentAbortController = abortController;

  // Si l'utilisateur est hors-ligne, basculer immédiatement sur SpeechSynthesis
  if (typeof window !== "undefined" && !navigator.onLine) {
    console.debug("[VoicePlayer] Mode hors-ligne détecté, utilisation de SpeechSynthesis.");
    return speakVoiceReminder(options);
  }

  try {
    // 1. Tenter la génération / récupération audio depuis la route API ElevenLabs
    const response = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortController.signal,
      body: JSON.stringify({
        text: text.trim(),
        language,
        voiceType,
      }),
    });

    if (sessionId !== currentPlaybackSessionId || isPlaybackStopped) {
      return false;
    }

    const contentType = response.headers.get("content-type") || "";

    // 2. Si le serveur retourne un flux audio MP3 valide
    if (response.ok && contentType.includes("audio/")) {
      const audioBlob = await response.blob();

      if (sessionId !== currentPlaybackSessionId || isPlaybackStopped) {
        return false;
      }

      const blobUrl = URL.createObjectURL(audioBlob);
      activeAudioBlobUrl = blobUrl;

      return new Promise<boolean>((resolve) => {
        let currentIteration = 0;
        const totalIterations = Math.max(1, repeat + 1);

        function playOnce() {
          if (sessionId !== currentPlaybackSessionId || isPlaybackStopped) {
            resolve(false);
            return;
          }

          const audio = new Audio(blobUrl);
          activeAudioElement = audio;

          // Ajustement de la vitesse et du volume
          audio.playbackRate = Math.max(0.7, Math.min(1.5, rate));
          audio.volume = Math.max(0, Math.min(1, volume));

          audio.onplay = () => {
            if (sessionId === currentPlaybackSessionId && currentIteration === 0 && onStart) {
              onStart();
            }
          };

          audio.onended = () => {
            if (sessionId !== currentPlaybackSessionId || isPlaybackStopped) {
              resolve(false);
              return;
            }

            currentIteration++;
            if (currentIteration < totalIterations) {
              // Pause de 1.2s entre les répétitions
              repeatTimeoutId = setTimeout(() => {
                repeatTimeoutId = null;
                if (sessionId === currentPlaybackSessionId && !isPlaybackStopped) {
                  playOnce();
                } else {
                  resolve(false);
                }
              }, 1200);
            } else {
              if (onEnd && sessionId === currentPlaybackSessionId && !isPlaybackStopped) {
                onEnd();
              }
              stopVoiceReminder(false);
              resolve(sessionId === currentPlaybackSessionId && !isPlaybackStopped);
            }
          };

          audio.onerror = (audioErr) => {
            if (sessionId !== currentPlaybackSessionId) {
              resolve(false);
              return;
            }
            console.warn("[VoicePlayer] Erreur lecture MP3 ElevenLabs, bascule sur fallback:", audioErr);
            stopVoiceReminder(false);
            // Fallback sur SpeechSynthesis
            speakVoiceReminder(options).then(resolve);
          };

          audio.play().catch((playErr) => {
            if (sessionId !== currentPlaybackSessionId) {
              resolve(false);
              return;
            }
            console.warn("[VoicePlayer] Autoplay bloqué ou erreur de lecture, bascule sur fallback:", playErr);
            stopVoiceReminder(false);
            // Fallback sur SpeechSynthesis
            speakVoiceReminder(options).then(resolve);
          });
        }

        playOnce();
      });
    }

    if (sessionId !== currentPlaybackSessionId || isPlaybackStopped) {
      return false;
    }

    // 3. Si la réponse est un JSON (ElevenLabs non configuré ou quota atteint), basculer proprement
    const json = await response.json().catch(() => ({}));
    if (json.fallback === "speechSynthesis") {
      console.debug("[VoicePlayer] Serveur recommande le fallback SpeechSynthesis:", json.error);
    }

    if (sessionId !== currentPlaybackSessionId || isPlaybackStopped) {
      return false;
    }

    return await speakVoiceReminder(options);
  } catch (fetchErr: any) {
    if (fetchErr?.name === "AbortError" || sessionId !== currentPlaybackSessionId || isPlaybackStopped) {
      return false;
    }

    console.warn("[VoicePlayer] Échec de l'appel TTS ElevenLabs, bascule immédiate sur SpeechSynthesis:", fetchErr?.message);
    // Fallback 1: SpeechSynthesis
    try {
      return await speakVoiceReminder(options);
    } catch {
      // Fallback 2: Carillon
      playNotificationChime(0.4);
      if (onError) onError(fetchErr);
      return false;
    }
  }
}
