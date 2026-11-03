"use client";

import { useMemo } from "react";
import { DateTime } from "luxon";
import { Calendar as CalendarIcon } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";

interface DashboardHeaderProps {
  userName?: string | null;
  timezone: string;
}

export function DashboardHeader({ userName, timezone }: DashboardHeaderProps) {
  const { locale, t , tr } = useLanguage();
  const now = DateTime.now().setZone(timezone);

  // Salutation contextuelle selon l'heure locale
  const greeting = useMemo(() => {
    const hour = now.hour;
    if (locale === "fr") {
      if (hour >= 5 && hour < 12) return "Bonjour";
      if (hour >= 12 && hour < 18) return "Bon après-midi";
      return "Bonsoir";
    }
    return t("dashboard.welcome");
  }, [now.hour, locale, t]);

  const rawDate = now.setLocale(locale).toFormat("cccc d LLLL yyyy");
  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const firstName = userName?.trim().split(" ")[0] ?? "";

  return (
    <div className="relative space-y-3" data-tour="dashboard-header">
      {/* Date du jour centrée */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink-100/70 dark:bg-white/5 text-xs text-ink-600 dark:text-ink-400 border border-ink-200/50 dark:border-white/5">
          <CalendarIcon className="w-3.5 h-3.5 text-ink-400" />
          <span className="capitalize">{formattedDate}</span>
        </span>
      </div>

      {/* Salutation à gauche, guide (audio + visite) à droite */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight text-ink-950 dark:text-white">
          {greeting}{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <SectionGuideTrigger section="dashboard" label={tr("Guide")} variant="audio-first" className="shrink-0" />
      </div>
    </div>
  );
}
