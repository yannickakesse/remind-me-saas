"use client";

/**
 * Voix du robot pour une étape du parcours (inscription, première activité, notifications).
 * Joue la phrase enregistrée de l'étape (lib/voice/journey-audio.ts) si elle existe dans la langue
 * de l'utilisateur et si ses rappels vocaux sont activés. Sinon : rien (le texte reste à l'écran).
 * Par défaut, une phrase n'est jouée qu'une fois par appareil. Si le navigateur bloque la lecture
 * automatique, elle n'est pas marquée comme entendue et sera retentée à la prochaine visite.
 */
import { useEffect } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { getLocalVoiceSettings, playAudioFile, stopVoiceReminder } from "@/lib/voice";
import { getJourneyAudioSrc } from "@/lib/voice/journey-audio";

const PLAYED_PREFIX = "remindme_journey_voice_";

export function hasHeardJourneyVoice(id: string): boolean {
  try {
    return Boolean(localStorage.getItem(PLAYED_PREFIX + id));
  } catch {
    return true;
  }
}

/** Joue une phrase du parcours ; résout `true` si la lecture a démarré. */
export async function playJourneyVoice(
  id: string,
  locale: string | undefined,
  options: { once?: boolean; onEnd?: () => void } = {}
): Promise<boolean> {
  const { once = true, onEnd } = options;
  if (typeof window === "undefined") return false;
  const prefs = getLocalVoiceSettings();
  if (!prefs.voice_reminders) return false;
  if (once && hasHeardJourneyVoice(id)) return false;
  const src = getJourneyAudioSrc(id, (locale || prefs.voice_language || "fr").slice(0, 2));
  if (!src) return false;
  const started = await playAudioFile({ src, priority: "section", rate: prefs.voice_playback_rate || 1, onEnd });
  if (started && once) {
    try {
      localStorage.setItem(PLAYED_PREFIX + id, "1");
    } catch {}
  }
  return started;
}

export function JourneyVoice({
  id,
  once = true,
  delay = 700,
  when = true,
  after,
}: {
  id: string;
  once?: boolean;
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
    const timer = setTimeout(() => {
      void playJourneyVoice(id, locale, { once }).then((s) => {
        started = s;
      });
    }, delay);
    return () => {
      clearTimeout(timer);
      // En quittant l'étape, on coupe sa phrase pour ne pas la superposer à la suivante
      if (started) stopVoiceReminder(false);
    };
  }, [id, locale, once, delay, when, after]);
  return null;
}
