import type { VoiceSettings, VoiceType, VoiceLanguage, RepeatVoice } from "./types";

const VOICE_PREFS_KEY = "remindme_voice_settings";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voice_reminders: true,
  voice_type: "system",
  voice_language: "fr",
  repeat_voice: 0,
  voice_category_activities: true,
  voice_category_tasks: true,
  voice_category_finances: true,
  voice_category_briefings: true,
  voice_hide_financial_amounts: false,
  voice_include_user_name: true,
  custom_voice_reminder_text: "",
  voice_playback_rate: 1.0,
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

    const validLanguages: VoiceLanguage[] = ["fr", "en", "es", "de", "pt"];
    const validVoiceTypes: VoiceType[] = ["system", "female", "male"];

    return {
      voice_reminders: typeof parsed.voice_reminders === "boolean" ? parsed.voice_reminders : true,
      voice_type: (validVoiceTypes.includes(parsed.voice_type) ? parsed.voice_type : "system") as VoiceType,
      voice_language: (validLanguages.includes(parsed.voice_language) ? parsed.voice_language : "fr") as VoiceLanguage,
      repeat_voice: (([0, 1, 2].includes(Number(parsed.repeat_voice)) ? Number(parsed.repeat_voice) : 0) as RepeatVoice),
      voice_category_activities: typeof parsed.voice_category_activities === "boolean" ? parsed.voice_category_activities : true,
      voice_category_tasks: typeof parsed.voice_category_tasks === "boolean" ? parsed.voice_category_tasks : true,
      voice_category_finances: typeof parsed.voice_category_finances === "boolean" ? parsed.voice_category_finances : true,
      voice_category_briefings: typeof parsed.voice_category_briefings === "boolean" ? parsed.voice_category_briefings : true,
      voice_hide_financial_amounts: typeof parsed.voice_hide_financial_amounts === "boolean" ? parsed.voice_hide_financial_amounts : false,
      voice_include_user_name: typeof parsed.voice_include_user_name === "boolean" ? parsed.voice_include_user_name : true,
      custom_voice_reminder_text: typeof parsed.custom_voice_reminder_text === "string" ? parsed.custom_voice_reminder_text : "",
      voice_playback_rate: typeof parsed.voice_playback_rate === "number" && parsed.voice_playback_rate >= 0.7 && parsed.voice_playback_rate <= 1.5 ? parsed.voice_playback_rate : 1.0,
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
