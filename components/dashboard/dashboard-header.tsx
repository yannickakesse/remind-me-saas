"use client";

import { useMemo } from "react";
import { DateTime } from "luxon";
import { Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";

interface DashboardHeaderProps {
  userName?: string | null;
  timezone: string;
}

export function DashboardHeader({ userName, timezone }: DashboardHeaderProps) {
  const { locale, t } = useLanguage();
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
    <div
      className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      data-tour="dashboard-header"
    >
      {/* Halo d'ambiance doré subtil */}
      <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-signal/15 dark:bg-signal/20 blur-3xl pointer-events-none" />

      <div className="relative min-w-0 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-signal/10 dark:bg-signal/20 text-signal text-[10px] sm:text-[11px] font-bold border border-signal/20 shadow-2xs">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Remind Me</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ink-100/70 dark:bg-white/5 text-[11px] text-ink-600 dark:text-ink-400 border border-ink-200/50 dark:border-white/5">
            <CalendarIcon className="w-3 h-3 text-ink-400" />
            <span className="capitalize">{formattedDate}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Cockpit actif</span>
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white truncate mt-1.5">
          {greeting}{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-0.5 line-clamp-1">
          {t("dashboard.overview_title")}
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-2 flex-wrap sm:flex-nowrap" data-tour="dashboard-quick-actions">
        <SectionGuideTrigger section="dashboard" label="Guide" />
        <QuickActions />
      </div>
    </div>
  );
}
