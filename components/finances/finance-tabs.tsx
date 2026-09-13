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
}

const TABS = [
  { id: "overview" as FinanceTab, label: "Vue globale", icon: Wallet },
  { id: "income" as FinanceTab, label: "Revenus", icon: TrendingUp },
  { id: "expenses" as FinanceTab, label: "Dépenses payées", icon: TrendingDown },
  { id: "scheduled" as FinanceTab, label: "Dépenses programmées", icon: Clock },
  { id: "savings" as FinanceTab, label: "Épargne & Objectifs", icon: PiggyBank },
  { id: "budgets" as FinanceTab, label: "Budgets mensuels", icon: Target },
];

export function FinanceTabs({ currentTab }: FinanceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleTabChange(tabId: FinanceTab) {
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[40px] tap-active ${
                isActive
                  ? "bg-gradient-to-r from-gold to-gold-dark text-white shadow-gold-subtle"
                  : "bg-canvas-raised border border-ink-200 text-ink-700 hover:border-gold/30 hover:bg-gold-soft/10 hover:text-ink-950"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-ink-500"}`} strokeWidth={1.8} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
