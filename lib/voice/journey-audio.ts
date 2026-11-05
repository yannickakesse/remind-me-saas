/**
 * Registre des voix du robot accompagnateur (parcours d'inscription, visite guidée, recommandations).
 * Fichiers : /public/voice/journey/<clé>-<langue>.mp3 — textes : lib/voice/journey-texts.json
 * (script à enregistrer : docs/voix-guide-parcours-a-coller.txt).
 *
 * Tant qu'un audio n'est pas déposé, sa clé n'est pas dans RECORDED : rien n'est joué (jamais de
 * voix ElevenLabs payante pour l'accompagnement), le texte reste affiché à l'écran.
 */
export const JOURNEY_AUDIO_VERSION = "1";
export const JOURNEY_LANGUAGES = ["fr", "en", "es", "de", "pt"] as const;

/** Clés dont les 5 fichiers sont présents dans /public/voice/journey. */
const RECORDED = new Set<string>([]);

export function getJourneyAudioSrc(key: string, language: string): string | null {
  const lang = (language || "").slice(0, 2).toLowerCase();
  if (!RECORDED.has(key) || !(JOURNEY_LANGUAGES as readonly string[]).includes(lang)) return null;
  return `/voice/journey/${key}-${lang}.mp3?v=${JOURNEY_AUDIO_VERSION}`;
}
