"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Sparkles, Sun, Moon, Sunrise, X, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface DailyWelcomeBannerProps {
  userName?: string | null;
  timezone?: string;
}

export function DailyWelcomeBanner({ userName, timezone = "Europe/Paris" }: DailyWelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [greetingIcon, setGreetingIcon] = useState<"sunrise" | "sun" | "moon">("sun");
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    try {
      const now = DateTime.now().setZone(timezone);
      const todayKey = now.toISODate(); // YYYY-MM-DD
      const storageKey = `remindme_daily_welcome_${todayKey}`;

      // Vérifier si l'utilisateur a déjà vu le message aujourd'hui
      const alreadySeen = localStorage.getItem(storageKey);
      if (alreadySeen) {
        return;
      }

      // Calcul du message selon l'heure
      const hour = now.hour;
      const firstName = userName ? userName.split(" ")[0] : "";
      const namePart = firstName ? ` ${firstName}` : "";

      if (hour >= 5 && hour < 12) {
        setGreeting(`Bonjour${namePart} !`);
        setGreetingIcon("sunrise");
      } else if (hour >= 12 && hour < 18) {
        setGreeting(`Bon après-midi${namePart} !`);
        setGreetingIcon("sun");
      } else {
        setGreeting(`Bonsoir${namePart} !`);
        setGreetingIcon("moon");
      }

      // Date formatée en français (ex: "Lundi 28 septembre 2026")
      const formatted = now.setLocale("fr").toFormat("EEEE d MMMM yyyy");
      setFormattedDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));

      // Afficher avec un léger délai pour une animation fluide
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 400);

      return () => clearTimeout(timer);
    } catch {
      // Ignorer si localStorage est inaccessible (ex: mode privé strict)
    }
  }, [userName, timezone]);

  const handleDismiss = () => {
    try {
      const now = DateTime.now().setZone(timezone);
      const todayKey = now.toISODate();
      localStorage.setItem(`remindme_daily_welcome_${todayKey}`, "true");
    } catch {
      // no-op
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-xl animate-in fade-in slide-in-from-top-6 duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-canvas-raised/95 backdrop-blur-xl border border-ink-200/80 shadow-2xl p-4 sm:p-5 ring-1 ring-black/5">
        {/* Lueur d'arrière-plan colorée */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-signal/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3.5">
          {/* Icône animée */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-signal/20 to-gold/20 flex items-center justify-center shrink-0 shadow-inner border border-signal/20">
            {greetingIcon === "sunrise" && <Sunrise className="w-6 h-6 text-amber-500 animate-pulse" />}
            {greetingIcon === "sun" && <Sun className="w-6 h-6 text-amber-500 animate-spin-slow" />}
            {greetingIcon === "moon" && <Moon className="w-6 h-6 text-indigo-500" />}
          </div>

          {/* Contenu textuel */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-ink-950 tracking-tight">
                {greeting}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-signal-soft text-signal">
                Bienvenue sur Remind Me
              </span>
            </div>

            <p className="text-xs font-medium text-ink-500 mt-0.5">
              {formattedDate}
            </p>

            <p className="text-xs text-ink-700 mt-2 leading-relaxed">
              Vos rappels, tâches et activités du jour sont prêts. Passez une excellente journée productive !
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3.5 flex-wrap">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3.5 py-1.5 rounded-xl bg-signal text-white text-xs font-semibold hover:bg-signal/90 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 tap-active"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> C'est parti !
              </button>

              <Link
                href="/dashboard"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-xl bg-canvas border border-ink-200 text-ink-700 hover:bg-ink-100 active:scale-95 text-xs font-medium transition-all flex items-center gap-1 tap-active"
              >
                Voir mon programme <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Bouton de fermeture rapide */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
