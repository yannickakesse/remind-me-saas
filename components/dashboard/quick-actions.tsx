"use client";

import Link from "next/link";
import { Plus, Briefcase, CheckSquare, TrendingDown } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import type { TranslationKey } from "@/lib/i18n/types";

const ACTIONS: { href: string; labelKey: TranslationKey; icon: any }[] = [
  { href: "/activities/new", labelKey: "dashboard.btn_activity", icon: Briefcase },
  { href: "/tasks/new", labelKey: "dashboard.btn_task", icon: CheckSquare },
  { href: "/finances?tab=scheduled&action=new", labelKey: "dashboard.btn_expense", icon: TrendingDown },
];

export function QuickActions() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action, index) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className={buttonClasses(index === 0 ? "primary" : "secondary", "sm")}
          >
            <Plus className="w-3.5 h-3.5 mr-1 shrink-0" strokeWidth={2.5} />
            <span>{t(action.labelKey)}</span>
          </Link>
        );
      })}
    </div>
  );
}
