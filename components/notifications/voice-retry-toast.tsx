"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import {
  playAudioFile,
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
  /** Le navigateur attend un toucher avant de jouer un son (iPhone, app ouverte depuis une notification). */
  needsTap: boolean;
  /** Voix préenregistrée du rappel (jouée en priorité : immédiate, sans crédit ElevenLabs). */
  standardSrc: string | null;
  /** Phrase « domaine » enchaînée après (rappel d'activité classée). */
  domainSrc: string | null;
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
      const needsTap = d.reason === "autoplay-blocked";
      setItem({ text: d.text, language: d.language, voiceType: d.voiceType, needsTap, standardSrc: d.standardSrc ?? null, domainSrc: d.domainSrc ?? null });
      if (timer) clearTimeout(timer);
      // Rappel en attente d'un toucher : on le laisse plus longtemps (la personne vient d'ouvrir l'app)
      timer = setTimeout(() => setItem(null), needsTap ? 90000 : 15000);
    }
    window.addEventListener("remindme:voice-unavailable", onUnavailable);
    return () => {
      window.removeEventListener("remindme:voice-unavailable", onUnavailable);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!item) return null;
  const rate = getLocalVoiceSettings().voice_playback_rate || 1.0;

  // Ce toucher autorise le son : voix préenregistrée du rappel si elle existe, sinon voix Remind Me
  const listen = () => {
    const it = item;
    setItem(null);
    if (it.standardSrc) {
      const domain = it.domainSrc;
      playAudioFile({
        src: it.standardSrc,
        priority: "preview",
        rate,
        onEnd: domain ? () => { playAudioFile({ src: domain, priority: "preview", rate }); } : undefined,
      }).then((ok) => {
        if (!ok) playVoiceReminder({ text: it.text, language: it.language, voiceType: it.voiceType, priority: "preview", rate });
      });
    } else {
      playVoiceReminder({ text: it.text, language: it.language, voiceType: it.voiceType, priority: "preview", rate });
    }
  };

  if (item.needsTap) {
    return (
      <div
        role="status"
        className="fixed left-1/2 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[60] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-signal/30 bg-canvas-raised dark:bg-slate-900 p-4 shadow-xl print:hidden"
      >
        <div className="flex items-start gap-3">
          <Volume2 className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900 dark:text-white">{tr("Votre rappel vocal est prêt")}</p>
            <p className="mt-1 line-clamp-3 text-xs text-ink-600 dark:text-ink-400">{item.text}</p>
            <button
              type="button"
              onClick={listen}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2 text-sm font-bold text-white shadow-sm active:scale-95"
            >
              <Volume2 className="h-4 w-4" /> {tr("Écouter")}
            </button>
          </div>
          <button type="button" onClick={() => setItem(null)} aria-label={tr("Fermer")} className="text-ink-400 hover:text-ink-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

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
              onClick={listen}
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
