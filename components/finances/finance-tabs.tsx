"use client";

import { useSearchParams, useRouter } from "next/navigation";
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

const TABS = [
  { id: "overview" as FinanceTab, label: "Vue globale", icon: Wallet },
  { id: "income" as FinanceTab, label: "Revenus", icon: TrendingUp },
  { id: "expenses" as FinanceTab, label: "Dépenses payées", icon: TrendingDown },
  { id: "scheduled" as FinanceTab, label: "Dépenses programmées", icon: Clock },
  { id: "savings" as FinanceTab, label: "Épargne & Objectifs", icon: PiggyBank },
  { id: "budgets" as FinanceTab, label: "Budgets mensuels", icon: Target },
];

export function FinanceTabs({ currentTab, onTabChange }: FinanceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
