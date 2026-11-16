"use client";

/**
 * Voix du robot pour une étape du parcours (inscription, première activité, notifications).
 * Joue la phrase enregistrée de l'étape (lib/voice/journey-audio.ts) si elle existe dans la langue
 * de l'utilisateur et si ses rappels vocaux sont activés. Sinon : rien (le texte reste à l'écran).
 * Par défaut, une phrase n'est jouée qu'une fois par appareil (ou `maxPerDay` fois par jour).
 * Si le navigateur bloque la lecture automatique (première visite sur téléphone, aucun toucher encore),
 * la phrase est jouée au premier toucher sur la page.
 */
import { useEffect } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { getLocalVoiceSettings, playAudioFileWhenAllowed, stopVoiceReminder } from "@/lib/voice";
import { getJourneyAudioSrc } from "@/lib/voice/journey-audio";

const PLAYED_PREFIX = "remindme_journey_voice_";

export function hasHeardJourneyVoice(id: string): boolean {
  try {
    return Boolean(localStorage.getItem(PLAYED_PREFIX + id));
  } catch {
    return true;
  }
}

/** Nombre de lectures aujourd'hui (pour `maxPerDay`). */
function playsToday(id: string): { day: string; count: number } {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const [d, c] = (localStorage.getItem(PLAYED_PREFIX + id + "_day") || "").split(":");
    return { day, count: d === day ? Number(c) || 0 : 0 };
  } catch {
    return { day, count: 0 };
  }
}

/** Joue une phrase du parcours ; résout `true` si la lecture a démarré (tout de suite ou au premier toucher). */
export async function playJourneyVoice(
  id: string,
  locale: string | undefined,
  options: { once?: boolean; maxPerDay?: number; onEnd?: () => void; cancel?: () => boolean } = {}
): Promise<boolean> {
  const { once = true, maxPerDay, onEnd, cancel } = options;
  if (typeof window === "undefined") return false;
  const prefs = getLocalVoiceSettings();
  if (!prefs.voice_reminders) return false;
  if (maxPerDay !== undefined) {
    if (playsToday(id).count >= maxPerDay) return false;
  } else if (once && hasHeardJourneyVoice(id)) return false;
  const src = getJourneyAudioSrc(id, (locale || prefs.voice_language || "fr").slice(0, 2));
  if (!src) return false;
  const started = await playAudioFileWhenAllowed({ src, priority: "section", rate: prefs.voice_playback_rate || 1, onEnd }, { cancel });
  if (started) {
    try {
      localStorage.setItem(PLAYED_PREFIX + id, "1");
      if (maxPerDay !== undefined) {
        const t = playsToday(id);
        localStorage.setItem(PLAYED_PREFIX + id + "_day", `${t.day}:${t.count + 1}`);
      }
    } catch {}
  }
  return started;
}

export function JourneyVoice({
  id,
  once = true,
  maxPerDay,
  delay = 700,
  when = true,
  after,
}: {
  id: string;
  once?: boolean;
  /** Rejouer au plus N fois par jour (au lieu d'une seule fois par appareil). */
  maxPerDay?: number;
  delay?: number;
  when?: boolean;
  /** Ne joue que si cette autre phrase a déjà été entendue. */
  after?: string;
}) {
  const { locale } = useLanguage();
  useEffect(() => {
    if (!when) return;
    if (after && !hasHeardJourneyVoice(after)) return;
    let started = false;
    let left = false;
    const timer = setTimeout(() => {
      void playJourneyVoice(id, locale, { once, maxPerDay, cancel: () => left }).then((s) => {
        started = s;
      });
    }, delay);
    return () => {
      left = true;
      clearTimeout(timer);
      // En quittant l'étape, on coupe sa phrase pour ne pas la superposer à la suivante
      if (started) stopVoiceReminder(false);
    };
  }, [id, locale, once, maxPerDay, delay, when, after]);
  return null;
}
