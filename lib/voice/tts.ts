import type { VoiceLanguage, VoiceSpeakOptions, VoiceType, RepeatVoice } from "./types";
import { playNotificationChime } from "@/lib/notifications/sound";

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
let isAudioUnlocked = false;

/**
 * Initialise le chargement asynchrone des voix du navigateur
 */
export function initVoiceEngine(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  function loadVoices() {
    try {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        cachedVoices = available;
        voicesLoaded = true;
      }
    } catch {}
  }

  loadVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

/**
 * Déverrouille la lecture audio et la synthèse vocale dès le premier geste utilisateur
 * (Obligatoire sur Safari iOS et Android Chrome)
 */
export function unlockVoiceAudio(): void {
  if (isAudioUnlocked || typeof window === "undefined") return;

  try {
    // 1. Déverrouillage Web Audio API
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      const ctx = new AudioCtxClass();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    }

    // 2. Déverrouillage silencieux de speechSynthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
      const silentUtterance = new SpeechSynthesisUtterance(" ");
      silentUtterance.volume = 0.01;
      silentUtterance.rate = 2.0;
      window.speechSynthesis.speak(silentUtterance);
    }

    isAudioUnlocked = true;
  } catch {}
}

/**
 * Vérifie si la synthèse vocale est disponible sur le navigateur/appareil
 */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/**
 * Récupère toutes les voix installées sur l'appareil pour la langue cible
 */
export function getAvailableVoices(language: VoiceLanguage = "fr"): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];

  const all = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const langPrefix = language === "fr" ? "fr" : language === "es" ? "es" : "en";

  return all.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
}

/**
 * Sélectionne la voix native optimale selon le genre (féminine, masculine ou système)
 */
export function findBestVoice(language: VoiceLanguage = "fr", voiceType: VoiceType = "system"): SpeechSynthesisVoice | null {
  const matchingVoices = getAvailableVoices(language);
  if (matchingVoices.length === 0) {
    // Fallback sur n'importe quelle voix si aucune voix spécifique n'est trouvée
    const all = cachedVoices.length > 0 ? cachedVoices : (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : []);
    return all[0] || null;
  }

  if (voiceType === "system") {
    // Préférer la voix par défaut du système pour cette langue
    const defaultVoice = matchingVoices.find((v) => v.default);
    return defaultVoice || matchingVoices[0] || null;
  }

  const femaleKeywords = ["female", "femme", "woman", "amélie", "audrey", "aurélie", "julie", "virginie", "samantha", "victoria", "karen", "zira", "mónica", "paulina", "helena", "clara", "marie", "celine", "alice"];
  const maleKeywords = ["male", "homme", "man", "thomas", "nicolas", "paul", "henri", "daniel", "david", "george", "jorge", "diego", "carlos", "alain", "antoine", "bernard", "guy"];

  const targetKeywords = voiceType === "female" ? femaleKeywords : maleKeywords;

  // 1. Recherche par mot-clé dans le nom de la voix
  for (const voice of matchingVoices) {
    const nameLower = voice.name.toLowerCase();
    if (targetKeywords.some((kw) => nameLower.includes(kw))) {
      return voice;
    }
  }

  // 2. Si non trouvée, renvoyer la première voix disponible pour la langue
  return matchingVoices[0] || null;
}

/**
 * Arrête toute lecture vocale en cours
 */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Exécute la lecture vocale intelligente avec gestion de la répétition
 */
export function speakVoiceReminder(options: VoiceSpeakOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      // Si la synthèse vocale n'est pas supportée, fallback sur le carillon officiel
      playNotificationChime(0.4);
      resolve(false);
      return;
    }

    const {
      text,
      language = "fr",
      voiceType = "system",
      repeat = 0,
      rate = 1.0,
      pitch = 1.0,
      volume = 1.0,
      onStart,
      onEnd,
      onError,
    } = options;

    try {
      // Réveil du moteur de synthèse (Safari bugfix)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Annuler les anciennes lectures en attente
      window.speechSynthesis.cancel();

      const selectedVoice = findBestVoice(language, voiceType);
      const targetLang = language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";

      let currentIteration = 0;
      const totalIterations = Math.max(1, repeat + 1);

      function speakOnce() {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang;
        utterance.rate = Math.max(0.7, Math.min(1.5, rate));
        utterance.pitch = Math.max(0.7, Math.min(1.4, pitch));
        utterance.volume = Math.max(0, Math.min(1, volume));

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          if (currentIteration === 0 && onStart) {
            onStart();
          }
        };

        utterance.onend = () => {
          currentIteration++;
          if (currentIteration < totalIterations) {
            // Pause courte de 1.2s entre les répétitions pour une clarté maximale
            setTimeout(() => {
              speakOnce();
            }, 1200);
          } else {
            if (onEnd) onEnd();
            resolve(true);
          }
        };

        utterance.onerror = (err) => {
          console.warn("[RemindMe TTS] Utterance error:", err);
          if (onError) onError(err);
          // Fallback sur le carillon Remind Me
          playNotificationChime(0.4);
          resolve(false);
        };

        window.speechSynthesis.speak(utterance);
      }

      speakOnce();
    } catch (err) {
      console.warn("[RemindMe TTS] Speak execution failed:", err);
      playNotificationChime(0.4);
      if (onError) onError(err);
      resolve(false);
    }
  });
}
