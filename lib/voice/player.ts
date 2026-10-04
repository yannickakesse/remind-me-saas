import type { VoiceSpeakOptions } from "./types";
import { speakVoiceReminder, stopSpeaking } from "./tts";
import { playNotificationChime } from "@/lib/notifications/sound";

let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioBlobUrl: string | null = null;

/**
 * Arrête immédiatement toute lecture audio en cours (ElevenLabs MP3 ou SpeechSynthesis).
 */
export function stopVoiceReminder(): void {
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

  // Interrompre toute lecture précédente
  stopVoiceReminder();

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
      body: JSON.stringify({
        text: text.trim(),
        language,
        voiceType,
      }),
    });

    const contentType = response.headers.get("content-type") || "";

    // 2. Si le serveur retourne un flux audio MP3 valide
    if (response.ok && contentType.includes("audio/")) {
      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      activeAudioBlobUrl = blobUrl;

      return new Promise<boolean>((resolve) => {
        let currentIteration = 0;
        const totalIterations = Math.max(1, repeat + 1);

        function playOnce() {
          const audio = new Audio(blobUrl);
          activeAudioElement = audio;

          // Ajustement de la vitesse et du volume
          audio.playbackRate = Math.max(0.7, Math.min(1.5, rate));
          audio.volume = Math.max(0, Math.min(1, volume));

          audio.onplay = () => {
            if (currentIteration === 0 && onStart) {
              onStart();
            }
          };

          audio.onended = () => {
            currentIteration++;
            if (currentIteration < totalIterations) {
              // Pause de 1.2s entre les répétitions
              setTimeout(() => {
                playOnce();
              }, 1200);
            } else {
              if (onEnd) onEnd();
              stopVoiceReminder();
              resolve(true);
            }
          };

          audio.onerror = (audioErr) => {
            console.warn("[VoicePlayer] Erreur lecture MP3 ElevenLabs, bascule sur fallback:", audioErr);
            stopVoiceReminder();
            // Fallback sur SpeechSynthesis
            speakVoiceReminder(options).then(resolve);
          };

          audio.play().catch((playErr) => {
            console.warn("[VoicePlayer] Autoplay bloqué ou erreur de lecture, bascule sur fallback:", playErr);
            stopVoiceReminder();
            // Fallback sur SpeechSynthesis
            speakVoiceReminder(options).then(resolve);
          });
        }

        playOnce();
      });
    }

    // 3. Si la réponse est un JSON (ElevenLabs non configuré ou quota atteint), basculer proprement
    const json = await response.json().catch(() => ({}));
    if (json.fallback === "speechSynthesis") {
      console.debug("[VoicePlayer] Serveur recommande le fallback SpeechSynthesis:", json.error);
    }

    return await speakVoiceReminder(options);
  } catch (fetchErr: any) {
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
