"use client";

import { useState, useEffect } from "react";
import { Sparkles, Volume2, VolumeX } from "lucide-react";
import { triggerContextualTour } from "@/components/onboarding/interactive-product-tour";
import {
  triggerSectionVoiceGuide,
  stopSectionVoiceGuide,
} from "@/components/onboarding/section-voice-assistant";
import { useLanguage } from "@/components/i18n/language-provider";

interface SectionGuideTriggerProps {
  section: string;
  label?: string;
  variant?: "pill" | "button" | "compact";
  className?: string;
}

const SECTION_TITLES: Record<string, Record<string, string>> = {
  dashboard: {
    fr: "Guide tableau de bord",
    en: "Dashboard guide",
    es: "Guía del panel",
    de: "Dashboard-Leitfaden",
    pt: "Guia do painel",
  },
  activities: {
    fr: "Guide des activités",
    en: "Activities guide",
    es: "Guía de actividades",
    de: "Aktivitäten-Leitfaden",
    pt: "Guia de atividades",
  },
  calendar: {
    fr: "Guide du planning",
    en: "Calendar guide",
    es: "Guía de la agenda",
    de: "Kalender-Leitfaden",
    pt: "Guia do calendário",
  },
  tasks: {
    fr: "Guide des tâches",
    en: "Tasks guide",
    es: "Guía de tareas",
    de: "Aufgaben-Leitfaden",
    pt: "Guia de tarefas",
  },
  finances: {
    fr: "Guide financier",
    en: "Financial guide",
    es: "Guía financiera",
    de: "Finanz-Leitfaden",
    pt: "Guia financeiro",
  },
  notifications: {
    fr: "Guide des alertes",
    en: "Notifications guide",
    es: "Guía de alertas",
    de: "Benachrichtigungs-Leitfaden",
    pt: "Guia de notificações",
  },
  clients: {
    fr: "Guide clients",
    en: "Clients guide",
    es: "Guía de clientes",
    de: "Kunden-Leitfaden",
    pt: "Guia de clientes",
  },
  reports: {
    fr: "Guide rentabilité",
    en: "Reports & Profitability guide",
    es: "Guía de rentabilidad",
    de: "Berichts-Leitfaden",
    pt: "Guia de relatórios",
  },
  settings: {
    fr: "Guide paramètres",
    en: "Settings guide",
    es: "Guía de configuración",
    de: "Einstellungs-Leitfaden",
    pt: "Guia de configurações",
  },
  messages: {
    fr: "Guide de l'Inbox",
    en: "Inbox guide",
    es: "Guía del buzón",
    de: "Posteingangs-Leitfaden",
    pt: "Guia da caixa de entrada",
  },
};

export function SectionGuideTrigger({
  section,
  label,
  variant = "pill",
  className = "",
}: SectionGuideTriggerProps) {
  const { t, locale } = useLanguage();
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  useEffect(() => {
    function handleVoiceStatus(e: any) {
      if (e?.detail?.section === section) {
        setIsVoiceActive(Boolean(e.detail.isPlaying));
      } else if (e?.detail?.isPlaying) {
        setIsVoiceActive(false);
      }
    }

    function handleStopAll() {
      setIsVoiceActive(false);
    }

    window.addEventListener("remindme:voice-section-status", handleVoiceStatus);
    window.addEventListener("remindme:stop-section-voice", handleStopAll);
    window.addEventListener("remindme:video-active", handleStopAll);

    return () => {
      window.removeEventListener("remindme:voice-section-status", handleVoiceStatus);
      window.removeEventListener("remindme:stop-section-voice", handleStopAll);
      window.removeEventListener("remindme:video-active", handleStopAll);
    };
  }, [section]);

  const localizedSectionTitle =
    SECTION_TITLES[section]?.[locale] ||
    SECTION_TITLES[section]?.en ||
    t("help.tab_page_guide") ||
    "Guide";

  const displayLabel = locale === "fr" && label ? label : localizedSectionTitle;

  function handleTrigger() {
    triggerContextualTour(section);
  }

  function handleVoiceClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isVoiceActive) {
      stopSectionVoiceGuide();
      setIsVoiceActive(false);
    } else {
      triggerSectionVoiceGuide(section);
    }
  }

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <button
          type="button"
          onClick={handleTrigger}
          title={`${t("help.btn_page_tour")}: ${displayLabel}`}
          aria-label={`${t("help.btn_page_tour")}: ${displayLabel}`}
          className="group inline-flex items-center justify-center h-8 w-8 rounded-xl border border-gold/40 bg-gold/10 text-gold-dark dark:text-gold-light hover:bg-gold/20 hover:border-gold active:scale-95 transition-all shadow-2xs tap-active cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
        </button>

        <button
          type="button"
          onClick={handleVoiceClick}
          title={isVoiceActive ? "Arrêter la voix" : "Écouter le guide vocal"}
          aria-label={isVoiceActive ? "Arrêter la voix" : "Écouter le guide vocal de cette section"}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-xl border transition-all cursor-pointer ${
            isVoiceActive
              ? "border-amber-500 bg-amber-500/20 text-amber-500 animate-pulse ring-2 ring-amber-500/30"
              : "border-ink-200 dark:border-ink-700 bg-canvas text-ink-500 hover:text-gold-dark dark:hover:text-gold-light hover:bg-gold/10"
          }`}
        >
          {isVoiceActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div
        className={`inline-flex items-center rounded-xl border border-gold/40 bg-gradient-to-r from-gold/15 to-gold-soft text-gold-dark dark:text-gold-light text-xs font-bold shadow-2xs ${className}`}
      >
        <button
          type="button"
          onClick={handleTrigger}
          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-gold-dark dark:text-gold-light" />
          <span>{displayLabel}</span>
        </button>

        <span className="h-3.5 w-px bg-gold/30 mx-0.5" />

        <button
          type="button"
          onClick={handleVoiceClick}
          title={isVoiceActive ? "Arrêter la voix" : "Écouter le guide vocal"}
          aria-label={isVoiceActive ? "Arrêter la voix" : "Écouter le guide vocal de cette section"}
          className={`p-1.5 pr-2.5 transition-all cursor-pointer ${
            isVoiceActive
              ? "text-amber-500 animate-pulse scale-110"
              : "text-gold-dark dark:text-gold-light hover:scale-110"
          }`}
        >
          {isVoiceActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  // Variant "pill" (par défaut, sobre et élégant dans n'importe quel en-tête)
  return (
    <div
      className={`inline-flex items-center rounded-full border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-800 shadow-2xs hover:border-gold/60 transition-all ${className}`}
    >
      <button
        type="button"
        onClick={handleTrigger}
        title={displayLabel}
        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-ink-600 dark:text-ink-300 hover:text-gold-dark dark:hover:text-gold-light text-xs font-semibold transition-all active:scale-95 cursor-pointer"
      >
        <Sparkles className="w-3 h-3 text-gold-dark dark:text-gold-light" />
        <span className="hidden sm:inline">{displayLabel}</span>
        <span className="sm:hidden">{t("help.tab_page_guide") || "Guide"}</span>
      </button>

      <span className="h-3 w-px bg-ink-200 dark:bg-ink-700 mx-0.5" />

      <button
        type="button"
        onClick={handleVoiceClick}
        title={isVoiceActive ? "Arrêter la voix" : "Écouter le guide vocal"}
        aria-label={isVoiceActive ? "Arrêter la voix" : "Écouter le guide vocal de cette section"}
        className={`p-1 pr-2 transition-all cursor-pointer ${
          isVoiceActive
            ? "text-amber-500 animate-pulse scale-110"
            : "text-ink-400 hover:text-gold-dark dark:hover:text-gold-light hover:scale-110"
        }`}
      >
        {isVoiceActive ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      </button>
    </div>
  );
}
