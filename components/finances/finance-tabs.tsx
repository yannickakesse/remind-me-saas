"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function FinanceTabs() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: "📊" },
    { id: "income", label: "Revenus", icon: "💰" },
    { id: "expenses", label: "Dépenses", icon: "💳" },
    { id: "budgets", label: "Budgets mensuels", icon: "⚖️" },
    { id: "savings", label: "Épargne & Objectifs", icon: "🎯" },
  ];

  return (
    <div className="border-b border-ink-200">
      <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Finance Tabs">
        {tabs.map((t) => {
          const isActive = currentTab === t.id;
          return (
            <Link
              key={t.id}
              href={`/finances?tab=${t.id}`}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-signal text-signal font-semibold"
                  : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
