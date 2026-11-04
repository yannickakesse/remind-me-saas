"use client";

import { useEffect, useState } from "react";
import { VolumeX, X } from "lucide-react";
import {
  playVoiceReminder,
  speakVoiceReminder,
  stopVoiceReminder,
  isSpeechSupported,
  getLocalVoiceSettings,
  type VoiceLanguage,
  type VoiceType,
} from "@/lib/voice";
import { useLanguage } from "@/components/i18n/language-provider";

interface Unavailable {
  text: string;
  language: VoiceLanguage;
  voiceType?: VoiceType;
}

// Seuls les messages que l'utilisateur attend (rappels, aperçus) déclenchent ce bandeau.
const SHOWN_PRIORITIES = new Set(["normal", "high", "critical", "preview"]);

/**
 * Quand la voix Remind Me (ElevenLabs) ne peut pas lire un rappel, on ne bascule pas
 * en silence vers une voix robotique : la notification écrite reste, et ce bandeau
 * propose de réessayer l'écoute ou d'utiliser la voix de l'appareil.
 */
export function VoiceRetryToast() {
  const { tr } = useLanguage();
  const [item, setItem] = useState<Unavailable | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onUnavailable(e: any) {
      const d = e?.detail;
      if (!d?.text || !SHOWN_PRIORITIES.has(d.priority)) return;
      setItem({ text: d.text, language: d.language, voiceType: d.voiceType });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setItem(null), 15000);
    }
    window.addEventListener("remindme:voice-unavailable", onUnavailable);
    return () => {
      window.removeEventListener("remindme:voice-unavailable", onUnavailable);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!item) return null;
  const rate = getLocalVoiceSettings().voice_playback_rate || 1.0;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[60] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-ink-200 dark:border-ink-700 bg-canvas-raised dark:bg-slate-900 p-4 shadow-xl print:hidden"
    >
      <div className="flex items-start gap-3">
        <VolumeX className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">{tr("Lecture vocale indisponible")}</p>
          <p className="mt-1 line-clamp-3 text-xs text-ink-600 dark:text-ink-400">{item.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const it = item;
                setItem(null);
                playVoiceReminder({ text: it.text, language: it.language, voiceType: it.voiceType, priority: "preview", rate });
              }}
              className="rounded-full bg-signal px-3 py-1.5 text-xs font-semibold text-white"
            >
              {tr("Réessayer l'écoute")}
            </button>
            {isSpeechSupported() && (
              <button
                type="button"
                onClick={() => {
                  const it = item;
                  setItem(null);
                  stopVoiceReminder(false);
                  speakVoiceReminder({ text: it.text, language: it.language, voiceType: it.voiceType, rate });
                }}
                className="rounded-full border border-ink-200 dark:border-ink-600 px-3 py-1.5 text-xs font-semibold text-ink-800 dark:text-ink-200"
              >
                {tr("Voix de l'appareil")}
              </button>
            )}
          </div>
        </div>
        <button type="button" onClick={() => setItem(null)} aria-label={tr("Fermer")} className="text-ink-400 hover:text-ink-900 dark:hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
