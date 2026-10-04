"use client";

import Link from "next/link";
import { Plus, Briefcase, CheckSquare, TrendingDown } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import type { TranslationKey } from "@/lib/i18n/types";

const ACTIONS: { href: string; label: string; icon: any; tone: "primary" | "secondary" }[] = [
  { href: "/activities", label: "Activités & Missions", icon: Briefcase, tone: "primary" },
  { href: "/tasks", label: "Tâches & To-Do", icon: CheckSquare, tone: "secondary" },
  { href: "/finances", label: "Finances & Dépenses", icon: TrendingDown, tone: "secondary" },
];

export function QuickActions() {
  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
      {/* Ligne 1 : Activités & Missions face-à-face avec Tâches & To-Do */}
      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
        <Link
          href="/activities"
          className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-xs tap-active cursor-pointer bg-signal text-white hover:bg-signal-dark hover:shadow-md"
        >
          <Briefcase className="w-3.5 h-3.5 shrink-0 text-white" strokeWidth={2.2} />
          <span className="truncate">Activités &amp; Missions</span>
        </Link>
        <Link
          href="/tasks"
          className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-xs tap-active cursor-pointer bg-canvas-raised dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-ink-950 dark:text-white hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          <CheckSquare className="w-3.5 h-3.5 shrink-0 text-signal" strokeWidth={2.2} />
          <span className="truncate">Tâches &amp; To-Do</span>
        </Link>
      </div>

      {/* Ligne 2 : Finances & Dépenses centré au milieu */}
      <div className="flex justify-center w-full">
        <Link
          href="/finances"
          className="flex items-center justify-center gap-1.5 px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-xs tap-active cursor-pointer bg-canvas-raised dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-ink-950 dark:text-white hover:bg-ink-100 dark:hover:bg-ink-800 w-full sm:w-auto max-w-[260px]"
        >
          <TrendingDown className="w-3.5 h-3.5 shrink-0 text-amber-500" strokeWidth={2.2} />
          <span className="truncate">Finances &amp; Dépenses</span>
        </Link>
      </div>
    </div>
  );
}
