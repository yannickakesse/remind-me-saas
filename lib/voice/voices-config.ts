import type { VoiceLanguage, VoiceType } from "./types";

/**
 * Registre centralisé des correspondances de voix ElevenLabs de Remind Me.
 *
 * Mappe dynamiquement (Langue + Genre/Type) vers le Voice ID configuré
 * dans les variables d'environnement serveur.
 *
 * ⚠️ RÈGLE DE SÉCURITÉ ABSOLUE :
 * Aucun Voice ID réel ni clé API n'est hardcodé dans le repository.
 * Ces identifiants sont strictement lus côté serveur via process.env.
 */

export interface VoiceProfileInfo {
  name: string;
  gender: "male" | "female";
  language: VoiceLanguage;
  available: boolean;
}

/**
 * Récupère le Voice ID ElevenLabs pour la langue et le type de voix demandés.
 * Fonctionne exclusivement côté serveur.
 */
export function getElevenLabsVoiceId(
  language: VoiceLanguage = "fr",
  voiceType: VoiceType = "system"
): string | null {
  const isFemale = voiceType === "female";
  const isMale = voiceType === "male";

  // 1. Français (FR)
  if (language === "fr") {
    if (isFemale) {
      // Catherine — Français féminin
      return process.env.ELEVENLABS_VOICE_FR_FEMALE || null;
    }
    // Yannick — Français masculin (défaut pour 'male' ou 'system')
    return process.env.ELEVENLABS_VOICE_FR_MALE || null;
  }

  // 2. Anglais (EN)
  if (language === "en") {
    if (isMale) {
      // Placeholder pour futur anglais masculin
      return process.env.ELEVENLABS_VOICE_EN_MALE || null;
    }
    // Déborah — Anglais féminin (défaut pour 'female' ou 'system')
    return process.env.ELEVENLABS_VOICE_EN_FEMALE || null;
  }

  // 3. Espagnol (ES)
  if (language === "es") {
    if (isMale) {
      return process.env.ELEVENLABS_VOICE_ES_MALE || null;
    }
    return process.env.ELEVENLABS_VOICE_ES_FEMALE || null;
  }

  // 4. Allemand (DE)
  if (language === "de") {
    if (isMale) {
      return process.env.ELEVENLABS_VOICE_DE_MALE || null;
    }
    return process.env.ELEVENLABS_VOICE_DE_FEMALE || null;
  }

  // 5. Portugais (PT)
  if (language === "pt") {
    if (isMale) {
      return process.env.ELEVENLABS_VOICE_PT_MALE || null;
    }
    return process.env.ELEVENLABS_VOICE_PT_FEMALE || null;
  }

  return null;
}

/**
 * Retourne le nom convivial de la voix pour l'affichage UI ou les logs.
 */
export function getVoiceDisplayName(
  language: VoiceLanguage = "fr",
  voiceType: VoiceType = "system"
): string {
  if (language === "fr") {
    return voiceType === "female" ? "Catherine (Français)" : "Yannick (Français)";
  }
  if (language === "en") {
    return voiceType === "male" ? "English (Male)" : "Déborah (English)";
  }
  if (language === "es") {
    return voiceType === "male" ? "Español (Hombre)" : "Martina (Español)";
  }
  if (language === "de") {
    return voiceType === "male" ? "Stefan (Deutsch)" : "Marlene (Deutsch)";
  }
  if (language === "pt") {
    return voiceType === "male" ? "Duarte (Português)" : "Francisca (Português)";
  }
  return "Voix Remind Me";
}
