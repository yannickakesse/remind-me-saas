"use client";

import { useSearchParams, useRouter } from "next/navigation";

export type FinanceTab = "overview" | "income" | "expenses" | "scheduled" | "budgets" | "savings";

interface FinanceTabsProps {
  currentTab: FinanceTab;
}

const TABS: Array<{ id: FinanceTab; label: string; icon: string }> = [
  { id: "overview", label: "Vue globale", icon: "📊" },
  { id: "income", label: "Revenus", icon: "📈" },
  { id: "expenses", label: "Dépenses payées", icon: "📉" },
  { id: "scheduled", label: "Dépenses programmées", icon: "⏰" },
  { id: "savings", label: "Épargne & Objectifs", icon: "🐷" },
  { id: "budgets", label: "Budgets mensuels", icon: "🎯" },
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
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[40px] tap-active ${
                isActive
                  ? "bg-signal text-white shadow-xs"
                  : "bg-canvas-raised border border-ink-200 text-ink-700 hover:bg-ink-100 hover:text-ink-950"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
