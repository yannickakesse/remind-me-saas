/**
 * Registre des voix du robot accompagnateur (parcours d'inscription, visite guidée, recommandations).
 * Fichiers : /public/voice/journey/<clé>-<langue>.mp3 — textes : lib/voice/journey-texts.json
 * (script à enregistrer : docs/voix-guide-parcours-a-coller.txt).
 *
 * Tant qu'un audio n'est pas déposé, sa clé n'est pas dans RECORDED : rien n'est joué (jamais de
 * voix ElevenLabs payante pour l'accompagnement), le texte reste affiché à l'écran.
 */
export const JOURNEY_AUDIO_VERSION = "2";
export const JOURNEY_LANGUAGES = ["fr", "en", "es", "de", "pt"] as const;

/**
 * Langues enregistrées, et pour chacune les clés présentes dans /public/voice/journey.
 * Une langue est ajoutée quand ses fichiers sont déposés (les autres langues restent en texte seul).
 */
/** Toutes les clés du robot (groupes signup, tour et tips de journey-texts.json). */
const RECORDED_KEYS = [
  "journey_landing",
  "journey_register",
  "journey_verify_email",
  "journey_login",
  "journey_identity",
  "journey_country",
  "journey_currency",
  "journey_timezone",
  "journey_activity_count",
  "journey_welcome",
  "tour_welcome",
  "tour_nav",
  "tour_dashboard",
  "tour_activities",
  "tour_tasks",
  "tour_finances",
  "tour_inbox",
  "tour_settings",
  "tour_done",
  "journey_first_activity",
  "journey_activity_form",
  "journey_activity_created",
  "journey_notifications",
  "journey_notifications_on",
  "journey_end",
  "tip_dashboard_1",
  "tip_dashboard_2",
  "tip_activities_1",
  "tip_activities_2",
  "tip_calendar_1",
  "tip_calendar_2",
  "tip_tasks_1",
  "tip_tasks_2",
  "tip_finances_1",
  "tip_finances_2",
  "tip_reports_1",
  "tip_reports_2",
  "tip_notifications_1",
  "tip_messages_1",
  "tip_settings_1",
  "tip_settings_2",
  "tip_clients_1",
  "tip_goals_1",
  "tip_goals_2",
];
const RECORDED: Record<string, Set<string>> = {
  fr: new Set(RECORDED_KEYS),
  en: new Set(RECORDED_KEYS),
  es: new Set(RECORDED_KEYS),
};

export function getJourneyAudioSrc(key: string, language: string): string | null {
  const lang = (language || "").slice(0, 2).toLowerCase();
  if (!RECORDED[lang]?.has(key) || !(JOURNEY_LANGUAGES as readonly string[]).includes(lang)) return null;
  return `/voice/journey/${key}-${lang}.mp3?v=${JOURNEY_AUDIO_VERSION}`;
}
