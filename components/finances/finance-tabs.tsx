"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/i18n/language-provider";
import { TranslationKey } from "@/lib/i18n/types";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  PiggyBank,
  Target,
} from "lucide-react";

export type FinanceTab = "overview" | "income" | "expenses" | "scheduled" | "budgets" | "savings";

interface FinanceTabsProps {
  currentTab: FinanceTab;
  onTabChange?: (tab: FinanceTab) => void;
}

const TABS: { id: FinanceTab; key: TranslationKey; icon: any }[] = [
  { id: "overview", key: "finances.tab_overview", icon: Wallet },
  { id: "income", key: "finances.tab_income", icon: TrendingUp },
  { id: "expenses", key: "finances.tab_expenses", icon: TrendingDown },
  { id: "scheduled", key: "finances.tab_scheduled", icon: Clock },
  { id: "savings", key: "finances.tab_savings", icon: PiggyBank },
  { id: "budgets", key: "finances.tab_budgets", icon: Target },
];

export function FinanceTabs({ currentTab, onTabChange }: FinanceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  function handleTabChange(tabId: FinanceTab) {
    if (onTabChange) {
      onTabChange(tabId);
      return;
    }

    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (tabId === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    const query = params.toString();
    router.push(query ? `/finances?${query}` : "/finances");
  }

  return (
    <div className="w-full max-w-full overflow-x-auto no-scrollbar pb-1 border-b border-ink-200">
      <div className="flex items-center gap-2 min-w-max py-0.5">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 min-h-[42px] tap-active cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-gold to-gold-dark text-white shadow-gold-subtle scale-[1.02] ring-2 ring-gold/30"
                  : "bg-canvas-raised dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-300 hover:border-gold/50 hover:bg-gold-soft/20 hover:text-ink-950 dark:hover:text-white hover:-translate-y-0.5 hover:shadow-sm"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "text-white scale-110" : "text-ink-500"}`} strokeWidth={2} />
              <span>{t(tab.key)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
