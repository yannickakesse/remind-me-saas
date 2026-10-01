import type { VoiceSettings, VoiceType, VoiceLanguage, RepeatVoice } from "./types";

const VOICE_PREFS_KEY = "remindme_voice_settings";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voice_reminders: true,
  voice_type: "system",
  voice_language: "fr",
  repeat_voice: 0,
};

/**
 * Récupère les préférences vocales stockées localement avec fallback sur les valeurs par défaut
 */
export function getLocalVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") return DEFAULT_VOICE_SETTINGS;

  try {
    const raw = localStorage.getItem(VOICE_PREFS_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    const parsed = JSON.parse(raw);

    return {
      voice_reminders: typeof parsed.voice_reminders === "boolean" ? parsed.voice_reminders : true,
      voice_type: (["system", "female", "male"].includes(parsed.voice_type) ? parsed.voice_type : "system") as VoiceType,
      voice_language: (["fr", "en", "es"].includes(parsed.voice_language) ? parsed.voice_language : "fr") as VoiceLanguage,
      repeat_voice: (([0, 1, 2].includes(Number(parsed.repeat_voice)) ? Number(parsed.repeat_voice) : 0) as RepeatVoice),
    };
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

/**
 * Enregistre les préférences vocales et notifie tous les composants de l'application
 */
export function saveLocalVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings {
  if (typeof window === "undefined") return DEFAULT_VOICE_SETTINGS;

  const current = getLocalVoiceSettings();
  const updated: VoiceSettings = {
    ...current,
    ...settings,
  };

  try {
    localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("remindme_voice_pref_changed", { detail: updated })
    );
  } catch {}

  return updated;
}
