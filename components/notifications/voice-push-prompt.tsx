"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Volume2, BellRing, Sparkles, X, ArrowRight, Check } from "lucide-react";
import { speakVoiceReminder, getLocalVoiceSettings } from "@/lib/voice";

const STORAGE_KEY = "remindme_voice_push_prompt_dismissed";

export function VoicePushPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Afficher la notification d'information vocale après 3.5 secondes
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 3500);
        return () => clearTimeout(timer);
      }
    } catch {
      // no-op
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // no-op
    }
    setIsVisible(false);
  };

  const handleTestVoice = () => {
    const prefs = getLocalVoiceSettings();
    speakVoiceReminder({
      text: "Bonjour ! Vos notifications orales et vocales Remind Me sont prêtes. Activez les notifications push dans vos paramètres pour ne rien manquer !",
      language: prefs.voice_language,
      voiceType: prefs.voice_type,
      repeat: 0,
    });
    setTested(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[92%] sm:w-full animate-in fade-in slide-in-from-bottom-5 duration-300 select-none">
      <div className="relative overflow-hidden rounded-3xl bg-canvas-raised/95 dark:bg-zinc-900/95 backdrop-blur-xl border-2 border-signal/40 shadow-2xl p-4 sm:p-5 ring-1 ring-signal/20">
        {/* Lueur d'ambiance */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-signal/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3">
          {/* Icône Vocale Animée */}
          <div className="w-10 h-10 rounded-2xl bg-signal text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
            <Volume2 className="w-5 h-5" strokeWidth={2.2} />
          </div>

          <div className="flex-1 min-w-0 pr-5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-signal/15 text-signal">
                Nouveau • Rappels Vocaux
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white mt-1">
              Activez vos notifications qui parlent ! 🔊
            </h4>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
              Pour entendre vos rappels oraux à chaque tâche ou activité, activez le bouton <strong>Push &amp; Synthèse Vocale</strong> dans vos Paramètres.
            </p>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={handleTestVoice}
                className="px-3 py-1.5 rounded-xl bg-signal/15 hover:bg-signal/25 text-signal text-xs font-bold transition-all flex items-center gap-1 cursor-pointer tap-active"
              >
                {tested ? <Check className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{tested ? "Voix testée !" : "Tester la voix"}</span>
              </button>

              <Link
                href="/settings"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-xl bg-signal hover:bg-signal-dark text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer tap-active"
              >
                <span>Paramètres</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer cette note"
            className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
