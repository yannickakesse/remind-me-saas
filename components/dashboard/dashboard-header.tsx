"use client";

import { DateTime } from "luxon";
import { useLanguage } from "@/components/i18n/language-provider";
import { QuickActions } from "@/components/dashboard/quick-actions";

interface DashboardHeaderProps {
  userName?: string | null;
  timezone: string;
}

export function DashboardHeader({ userName, timezone }: DashboardHeaderProps) {
  const { locale, t } = useLanguage();
  const now = DateTime.now().setZone(timezone);
  const formattedDate = now.setLocale(locale).toFormat("cccc d LLLL yyyy");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-tour="dashboard-header">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white truncate">
          {t("dashboard.welcome")} {userName?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-xs text-ink-500 mt-0.5 capitalize">
          {formattedDate} — <span className="normal-case">{t("dashboard.overview_title")}</span>
        </p>
      </div>
      <div data-tour="dashboard-quick-actions">
        <QuickActions />
      </div>
    </div>
  );
}
