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
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-xs tap-active cursor-pointer ${
              action.tone === "primary"
                ? "bg-signal text-white hover:bg-signal-dark hover:shadow-md hover:-translate-y-0.5"
                : "bg-canvas-raised dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-ink-800 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 hover:border-signal/40 hover:-translate-y-0.5 hover:shadow-sm"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 text-gold-dark dark:text-gold" strokeWidth={2.2} />
            <span>{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
