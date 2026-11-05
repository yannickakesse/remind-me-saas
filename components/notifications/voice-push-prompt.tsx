"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { onWelcomeDone } from "@/lib/onboarding/welcome-sequence";
import { usePopupSlot } from "@/lib/ui/popup-queue";
import { playNotificationChime } from "@/lib/notifications/sound";
import { playAudioFile, getLocalVoiceSettings } from "@/lib/voice";
import { getJourneyAudioSrc } from "@/lib/voice/journey-audio";

const STORAGE_KEY = "remindme_voice_push_prompt_dismissed";

/**
 * Invitation à activer les rappels vocaux : une cloche qui sonne, une phrase courte,
 * un seul bouton. La voix du robot la lit (audio enregistré) quand il est disponible.
 * Passe dans la file des fenêtres : jamais en même temps qu'une autre.
 */
export function VoicePushPrompt() {
  const { tr, locale } = useLanguage();
  const [wanted, setWanted] = useState(false);
  const visible = usePopupSlot("voicePush", wanted);
  const rang = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancelWait = onWelcomeDone(() => {
      timer = setTimeout(() => setWanted(true), 2500);
    });
    return () => {
      cancelWait();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // La cloche sonne à l'apparition, puis la voix explique (si l'audio enregistré existe)
  useEffect(() => {
    if (!visible || rang.current) return;
    rang.current = true;
    playNotificationChime(0.35);
    const prefs = getLocalVoiceSettings();
    const src = getJourneyAudioSrc("journey_notifications", (locale || prefs.voice_language || "fr").slice(0, 2));
    if (prefs.voice_reminders && src) {
      setTimeout(() => void playAudioFile({ src, priority: "preview", rate: prefs.voice_playback_rate || 1 }), 900);
    }
  }, [visible, locale]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setWanted(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-50 flex justify-center px-4 md:justify-end md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-signal/30 bg-canvas-raised/95 dark:bg-slate-900/95 p-5 text-center shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label={tr("Fermer")}
          className="absolute right-3 top-3 rounded-full p-1 text-ink-400 hover:text-ink-900 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-signal text-white shadow-lg shadow-signal/30">
          <BellRing className="h-7 w-7 origin-top animate-[bell-ring_1.2s_ease-in-out_2]" strokeWidth={2.2} />
        </div>
        <p className="text-base font-bold text-ink-950 dark:text-white">{tr("Activez vos rappels vocaux")}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-600 dark:text-ink-300">
          {tr("Remind Me vous prévient au bon moment, même quand l'application est fermée. Activez les notifications dans vos paramètres.")}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Link
            href="/settings?tab=notifications"
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-full bg-signal px-5 py-2.5 text-xs font-bold text-white shadow-xs"
          >
            {tr("Activer")}
          </Link>
          <button type="button" onClick={dismiss} className="rounded-full px-4 py-2.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
            {tr("Plus tard")}
          </button>
        </div>
      </div>
    </div>
  );
}
