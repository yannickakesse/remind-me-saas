import type { VoiceSpeakOptions, VoicePriority } from "./types";
import { speakVoiceReminder, stopSpeaking, isSpeechSynthesizing, hasNaturalDeviceVoice } from "./tts";
import { playNotificationChime } from "@/lib/notifications/sound";
import {
  resolveStandardAlertKey,
  getStandardAlertSrc,
  getDomainAlertSrc,
  isPersonalizedVoiceEnabled,
  type ReminderAlertInfo,
} from "./standard-alerts";

/**
 * Lecteur audio central de Remind Me.
 *
 * Un seul élément <audio> partagé sert à TOUT (guides préenregistrés, voix ElevenLabs) :
 * - jamais deux sons en même temps ;
 * - sur iPhone / PWA, il est « déverrouillé » au premier toucher de l'utilisateur,
 *   ce qui permet ensuite de jouer un son même après un appel réseau.
 */

let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioBlobUrl: string | null = null;
let currentPlayingPriority: VoicePriority | null = null;
let repeatTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isPlaybackStopped = false;
let isPlaybackPaused = false;
let currentPlaybackSessionId = 0;
let currentAbortController: AbortController | null = null;

const VOICE_CHANNEL_NAME = "remindme_notif_channel";

// ─── Élément audio partagé + déverrouillage mobile ──────────────────────────
const SILENT_MP3 =
  "data:audio/mpeg;base64,//NAxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEWwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

let sharedAudio: HTMLAudioElement | null = null;
let sharedUnlocked = false;
let unlockListenersInstalled = false;

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
    sharedAudio.setAttribute("playsinline", "true");
    installUnlockListeners();
  }
  return sharedAudio;
}

function clearAudioHandlers(audio: HTMLAudioElement) {
  audio.onplay = null;
  audio.onended = null;
  audio.onerror = null;
}

/** À appeler pendant un geste utilisateur (toucher, clic) : autorise les lectures suivantes. */
export function unlockVoicePlayback(): void {
  if (sharedUnlocked || typeof window === "undefined") return;
  const audio = getSharedAudio();
  if (activeAudioElement) return; // une lecture est déjà en cours : rien à déverrouiller
  try {
    clearAudioHandlers(audio);
    audio.src = SILENT_MP3;
    audio
      .play()
      .then(() => {
        sharedUnlocked = true;
        if (!activeAudioElement) audio.pause();
        removeUnlockListeners();
      })
      .catch(() => {});
  } catch {}
}

const UNLOCK_EVENTS = ["pointerdown", "touchend", "keydown"] as const;
function onUserGesture() {
  unlockVoicePlayback();
}
function installUnlockListeners() {
  if (unlockListenersInstalled || typeof document === "undefined") return;
  unlockListenersInstalled = true;
  UNLOCK_EVENTS.forEach((e) => document.addEventListener(e, onUserGesture, { capture: true, passive: true }));
}
function removeUnlockListeners() {
  if (typeof document === "undefined") return;
  UNLOCK_EVENTS.forEach((e) => document.removeEventListener(e, onUserGesture, { capture: true }));
}

if (typeof window !== "undefined") {
  // Prépare l'écoute du premier geste dès le chargement de l'app
  installUnlockListeners();
}

// ─── État de lecture (pour les boutons lecture / pause) ─────────────────────
function emitVoiceState() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("remindme:voice-state", {
      detail: { playing: activeAudioElement !== null || isSpeechSynthesizing(), paused: isPlaybackPaused },
    })
  );
}

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
 * Vérifie si une lecture vocale est actuellement en cours (MP3 ou SpeechSynthesis), même en pause.
 */
export function isVoicePlaying(): boolean {
  return activeAudioElement !== null || isSpeechSynthesizing();
}

/** La lecture en cours est-elle en pause ? */
export function isVoicePaused(): boolean {
  return isPlaybackPaused;
}

/**
 * Retourne la priorité du message vocal en cours de lecture.
 */
export function getCurrentVoicePriority(): VoicePriority | null {
  return currentPlayingPriority;
}

/** Met en pause la lecture en cours (reprise possible avec resumeVoice). */
export function pauseVoice(): void {
  if (isPlaybackPaused) return;
  if (activeAudioElement && !activeAudioElement.paused) {
    activeAudioElement.pause();
    isPlaybackPaused = true;
  } else if (typeof window !== "undefined" && isSpeechSynthesizing()) {
    window.speechSynthesis.pause();
    isPlaybackPaused = true;
  }
  emitVoiceState();
}

/** Reprend la lecture mise en pause. */
export function resumeVoice(): void {
  if (!isPlaybackPaused) return;
  isPlaybackPaused = false;
  if (activeAudioElement) {
    activeAudioElement.play().catch(() => {});
  } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.resume();
  }
  emitVoiceState();
}

/**
 * Arrête immédiatement toute lecture audio en cours (fichier, ElevenLabs ou SpeechSynthesis).
 */
export function stopVoiceReminder(broadcast = true): void {
  isPlaybackStopped = true;
  isPlaybackPaused = false;
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
      clearAudioHandlers(activeAudioElement);
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
  emitVoiceState();
}

/**
 * Arbitrage : une lecture moins prioritaire n'interrompt jamais une lecture plus importante.
 * Retourne un identifiant de session, ou null si la lecture est refusée.
 */
function claimPlayback(priority: VoicePriority): number | null {
  if (
    typeof window !== "undefined" &&
    (window as any).__REMINDME_VIDEO_PLAYING &&
    priority !== "critical"
  ) {
    return null;
  }

  if (isVoicePlaying()) {
    if (priority === "greeting" || priority === "section") return null;
    const incomingLevel = PRIORITY_LEVELS[priority] ?? 2;
    const currentLevel = currentPlayingPriority ? (PRIORITY_LEVELS[currentPlayingPriority] ?? 2) : 2;
    if (incomingLevel < currentLevel) return null;
  }

  stopVoiceReminder(false);
  isPlaybackStopped = false;
  currentPlayingPriority = priority;
  return ++currentPlaybackSessionId;
}

const isCurrent = (sessionId: number) => sessionId === currentPlaybackSessionId && !isPlaybackStopped;

/**
 * Joue un fichier audio (guides préenregistrés) dans le lecteur central.
 * Résout `true` dès que la lecture démarre, `false` si le fichier est absent ou la lecture bloquée.
 * `onEnd` est appelé à la fin normale de la lecture.
 */
export function playAudioFile(options: {
  src: string;
  priority?: VoicePriority;
  rate?: number;
  volume?: number;
  /** Nombre de répétitions supplémentaires (0, 1 ou 2), avec une courte pause entre chaque. */
  repeat?: number;
  onEnd?: () => void;
}): Promise<boolean> {
  const { src, priority = "section", rate = 1.0, volume = 1.0, repeat = 0, onEnd } = options;
  let remaining = Math.max(0, Math.min(2, repeat));
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const sessionId = claimPlayback(priority);
    if (sessionId === null) return resolve(false);

    const audio = getSharedAudio();
    clearAudioHandlers(audio);
    activeAudioElement = audio;
    let settled = false;
    const settle = (v: boolean) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };

    audio.onended = () => {
      if (!isCurrent(sessionId)) return;
      if (remaining > 0) {
        remaining--;
        repeatTimeoutId = setTimeout(() => {
          repeatTimeoutId = null;
          if (isCurrent(sessionId)) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
        }, 1200);
        return;
      }
      activeAudioElement = null;
      currentPlayingPriority = null;
      clearAudioHandlers(audio);
      emitVoiceState();
      onEnd?.();
    };
    audio.onerror = () => {
      if (!isCurrent(sessionId)) return settle(false);
      activeAudioElement = null;
      currentPlayingPriority = null;
      clearAudioHandlers(audio);
      emitVoiceState();
      settle(false);
    };

    audio.src = src;
    audio.playbackRate = Math.max(0.7, Math.min(1.5, rate));
    audio.volume = Math.max(0, Math.min(1, volume));
    audio
      .play()
      .then(() => {
        sharedUnlocked = true;
        emitVoiceState();
        settle(isCurrent(sessionId));
      })
      .catch(() => {
        if (isCurrent(sessionId)) {
          activeAudioElement = null;
          currentPlayingPriority = null;
          clearAudioHandlers(audio);
          emitVoiceState();
        }
        settle(false);
      });
  });
}

/**
 * Secours quand ElevenLabs ne répond pas : on ne passe à la voix de l'appareil
 * que si elle est de bonne qualité (ou explicitement demandée). Sinon : carillon
 * + événement « voix indisponible » pour proposer de réessayer l'écoute.
 */
function fallbackSpeak(options: VoiceSpeakOptions & { standardSrc?: string | null; domainSrc?: string | null }, reason: string): Promise<boolean> {
  const language = options.language || "fr";
  if (options.silentFailure) {
    currentPlayingPriority = null;
    emitVoiceState();
    return Promise.resolve(false);
  }
  // Son bloqué par le navigateur (iPhone : app ouverte depuis une notification, aucun toucher encore) :
  // la voix de l'appareil serait bloquée elle aussi, mais EN SILENCE. On affiche donc le bouton « Écouter ».
  const blockedByBrowser = reason === "autoplay-blocked" || !sharedUnlocked;
  if (!blockedByBrowser && (options.allowDeviceVoice || hasNaturalDeviceVoice(language))) {
    return speakVoiceReminder(options).finally(emitVoiceState);
  }
  currentPlayingPriority = null;
  const priority = options.priority || "normal";
  if (priority === "normal" || priority === "high" || priority === "critical") playNotificationChime(0.4);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("remindme:voice-unavailable", {
        detail: {
          text: options.text,
          language,
          voiceType: options.voiceType,
          priority,
          reason: blockedByBrowser ? "autoplay-blocked" : reason,
          standardSrc: options.standardSrc ?? null,
          domainSrc: options.domainSrc ?? null,
        },
      })
    );
  }
  options.onError?.(new Error("voice-unavailable"));
  emitVoiceState();
  return Promise.resolve(false);
}

/**
 * Lecture d'un message vocal dynamique (rappels, notifications, aperçus).
 *
 * HIÉRARCHIE :
 * 1. Voix ElevenLabs (générée côté serveur, mise en cache)
 * 2. Voix de l'appareil, uniquement si elle est naturelle ou demandée
 * 3. Carillon + proposition « Réessayer l'écoute »
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
  } = options;

  if (!text || !text.trim()) {
    return false;
  }

  const claimed = claimPlayback(priority);
  if (claimed === null) {
    console.debug(`[VoicePlayer] Annonce '${priority}' ignorée : une lecture plus importante est en cours.`);
    return false;
  }
  const sessionId: number = claimed;
  const abortController = new AbortController();
  currentAbortController = abortController;

  if (typeof window !== "undefined" && !navigator.onLine) {
    return fallbackSpeak(options, "offline");
  }

  try {
    const response = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortController.signal,
      body: JSON.stringify({ text: text.trim(), language, voiceType }),
    });

    if (!isCurrent(sessionId)) return false;

    const contentType = response.headers.get("content-type") || "";

    if (response.ok && contentType.includes("audio/")) {
      const audioBlob = await response.blob();
      if (!isCurrent(sessionId)) return false;

      const blobUrl = URL.createObjectURL(audioBlob);
      activeAudioBlobUrl = blobUrl;

      return new Promise<boolean>((resolve) => {
        let currentIteration = 0;
        const totalIterations = Math.max(1, repeat + 1);

        function playOnce() {
          if (!isCurrent(sessionId)) {
            resolve(false);
            return;
          }

          const audio = getSharedAudio();
          clearAudioHandlers(audio);
          activeAudioElement = audio;

          audio.onplay = () => {
            if (sessionId === currentPlaybackSessionId && currentIteration === 0 && onStart) {
              onStart();
            }
          };

          audio.onended = () => {
            if (!isCurrent(sessionId)) {
              resolve(false);
              return;
            }
            currentIteration++;
            if (currentIteration < totalIterations) {
              repeatTimeoutId = setTimeout(() => {
                repeatTimeoutId = null;
                if (isCurrent(sessionId)) playOnce();
                else resolve(false);
              }, 1200);
            } else {
              if (onEnd) onEnd();
              stopVoiceReminder(false);
              resolve(true);
            }
          };

          audio.onerror = () => {
            if (sessionId !== currentPlaybackSessionId) {
              resolve(false);
              return;
            }
            console.warn("[VoicePlayer] Erreur de lecture du MP3 ElevenLabs.");
            stopVoiceReminder(false);
            fallbackSpeak(options, "playback-error").then(resolve);
          };

          audio.src = blobUrl;
          audio.playbackRate = Math.max(0.7, Math.min(1.5, rate));
          audio.volume = Math.max(0, Math.min(1, volume));
          audio
            .play()
            .then(() => {
              sharedUnlocked = true;
              emitVoiceState();
            })
            .catch((playErr) => {
              if (sessionId !== currentPlaybackSessionId) {
                resolve(false);
                return;
              }
              console.warn("[VoicePlayer] Lecture bloquée par le navigateur :", playErr?.name);
              stopVoiceReminder(false);
              fallbackSpeak(options, "autoplay-blocked").then(resolve);
            });
        }

        playOnce();
      });
    }

    if (!isCurrent(sessionId)) return false;
    const json = await response.json().catch(() => ({}));
    if (!isCurrent(sessionId)) return false;
    return await fallbackSpeak(options, json?.reason || "tts-unavailable");
  } catch (fetchErr: any) {
    if (fetchErr?.name === "AbortError" || !isCurrent(sessionId)) {
      return false;
    }
    console.warn("[VoicePlayer] Appel de la voix ElevenLabs impossible :", fetchErr?.message);
    return fallbackSpeak(options, "network");
  }
}

/**
 * Lecture d'un RAPPEL (activité, tâche, paiement, dépense…).
 *
 * Ordre :
 * - par défaut : voix standard préenregistrée (immédiate, sans crédit ElevenLabs) ;
 * - si la voix personnalisée est activée : ElevenLabs (prénom, nom, heure), puis la voix standard si elle échoue ;
 * - en dernier recours : le secours habituel (voix de l'appareil si naturelle, sinon bandeau « Réessayer »).
 */
export async function playReminderVoice(
  options: VoiceSpeakOptions & { alert?: ReminderAlertInfo | null }
): Promise<boolean> {
  const { alert, ...speak } = options;
  const language = speak.language || "fr";
  const src = getStandardAlertSrc(resolveStandardAlertKey(alert), language);
  // Rappel d'activité classée : phrase « domaine » enchaînée après la phrase de délai (si enregistrée)
  const domainSrc = alert?.kind?.startsWith("activity_reminder_") ? getDomainAlertSrc(alert?.metadata?.activity_domain, language) : null;

  const playStandard = async () => {
    if (!src) return false;
    const started = await playAudioFile({
      src,
      priority: speak.priority || "normal",
      rate: speak.rate,
      volume: speak.volume,
      repeat: domainSrc ? 0 : speak.repeat,
      onEnd: domainSrc
        ? () => {
            playAudioFile({ src: domainSrc, priority: speak.priority || "normal", rate: speak.rate, volume: speak.volume, onEnd: speak.onEnd }).then((ok) => {
              if (!ok) speak.onEnd?.();
            });
          }
        : speak.onEnd,
    });
    if (started) speak.onStart?.();
    return started;
  };

  if (isPersonalizedVoiceEnabled() && speak.text?.trim() && sharedUnlocked) {
    const ok = await playVoiceReminder({ ...speak, silentFailure: Boolean(src) });
    if (ok || !src) return ok;
    if (await playStandard()) return true;
    return fallbackSpeak({ ...speak, standardSrc: src, domainSrc }, "standard-unavailable");
  }

  if (await playStandard()) return true;
  // Le navigateur bloque le son tant qu'on n'a pas touché l'écran : inutile d'appeler ElevenLabs (crédits perdus),
  // on propose directement « Écouter » (un toucher suffit, puis la voix est jouée).
  if (!sharedUnlocked) return fallbackSpeak({ ...speak, standardSrc: src, domainSrc }, "autoplay-blocked");
  // Pas d'audio standard (langue non enregistrée, fichiers absents) : voix ElevenLabs puis secours habituel
  return speak.text?.trim() ? playVoiceReminder(speak) : fallbackSpeak(speak, "no-audio");
}
