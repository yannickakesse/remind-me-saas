/**
 * Registre central des guides vocaux préenregistrés (voix ElevenLabs).
 *
 * Fichiers : /public/voice/guides/<section>-<langue>.mp3
 * Pour remplacer un audio : déposer le nouveau fichier sous le même nom,
 * puis incrémenter GUIDE_AUDIO_VERSION (force les navigateurs à le recharger).
 * Pour ajouter une langue : déposer les 10 fichiers et l'ajouter à GUIDE_AUDIO_LANGUAGES.
 */

export const GUIDE_AUDIO_VERSION = "2";

export const GUIDE_AUDIO_SECTIONS = [
  "dashboard",
  "activities",
  "calendar",
  "tasks",
  "finances",
  "reports",
  "notifications",
  "messages",
  "settings",
  "clients",
  "goals",
] as const;

export const GUIDE_AUDIO_LANGUAGES = ["fr", "en", "es", "de", "pt"] as const;

export type GuideAudioSection = (typeof GUIDE_AUDIO_SECTIONS)[number];

/** Pages enregistrées seulement dans certaines langues (les autres gardent la voix de synthèse). */
const PARTIAL_SECTIONS: Record<string, readonly string[]> = {
  goals: ["fr", "en", "es"],
};

/** Chemin du fichier audio d'un guide, ou null s'il n'existe pas pour cette langue. */
export function getGuideAudioSrc(section: string, language: string): string | null {
  const lang = (language || "").slice(0, 2).toLowerCase();
  if (!(GUIDE_AUDIO_SECTIONS as readonly string[]).includes(section)) return null;
  if (!(GUIDE_AUDIO_LANGUAGES as readonly string[]).includes(lang)) return null;
  if (PARTIAL_SECTIONS[section] && !PARTIAL_SECTIONS[section].includes(lang)) return null;
  return `/voice/guides/${section}-${lang}.mp3?v=${GUIDE_AUDIO_VERSION}`;
}
