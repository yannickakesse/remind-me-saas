"use client";

import { useState } from "react";
import { TrendingDown, TrendingUp, PieChart } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import { expenseCategoryLabel } from "@/lib/validation/finances";
import type { CategoryBreakdownItem } from "@/lib/reports/profitability";

interface CategoryBreakdownProps {
  items?: CategoryBreakdownItem[]; // Dépenses par défaut
  expenseItems?: CategoryBreakdownItem[];
  incomeItems?: CategoryBreakdownItem[];
}

export function CategoryBreakdown({
  items = [],
  expenseItems,
  incomeItems = [],
}: CategoryBreakdownProps) {
  const [activeMode, setActiveMode] = useState<"expenses" | "income">("expenses");

  const effectiveExpenseItems = expenseItems ?? items;
  const currentItems = activeMode === "expenses" ? effectiveExpenseItems : incomeItems;

  return (
    <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-canvas-raised p-5 sm:p-6 space-y-4 shadow-xs">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-100 dark:border-ink-800/80 pb-3.5">
        <div>
          <h3 className="font-bold text-ink-950 dark:text-ink-50 text-base flex items-center gap-2">
            <PieChart className="w-4 h-4 text-signal" />
            Répartition par Catégorie
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            {activeMode === "expenses"
              ? "Identifiez les postes qui consomment le plus de trésorerie"
              : "Identifiez les activités & sources qui génèrent le plus de revenus"}
          </p>
        </div>

        {/* Toggle Mode Buttons */}
        <div className="flex items-center gap-1 bg-ink-100/70 dark:bg-ink-800/80 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode("expenses")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "expenses"
                ? "bg-canvas-raised text-danger shadow-xs"
                : "text-ink-600 dark:text-ink-400 hover:text-ink-950"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-danger" />
            Dépenses ({effectiveExpenseItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("income")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "income"
                ? "bg-canvas-raised text-positive shadow-xs"
                : "text-ink-600 dark:text-ink-400 hover:text-ink-950"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-positive" />
            Revenus ({incomeItems.length})
          </button>
        </div>
      </div>

      {/* List / Progress Bars */}
      {currentItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 dark:border-ink-800 bg-canvas/50 p-6 text-center text-xs text-ink-500">
          {activeMode === "expenses"
            ? "Aucune dépense enregistrée sur cette période."
            : "Aucun revenu enregistré sur cette période."}
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {currentItems.map((item, idx) => {
            const label =
              activeMode === "expenses"
                ? expenseCategoryLabel(item.category)
                : item.category;

            return (
              <div
                key={`${item.category}-${idx}`}
                className="group space-y-1.5 p-2 rounded-xl hover:bg-canvas/60 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        activeMode === "expenses"
                          ? "bg-danger"
                          : "bg-positive"
                      }`}
                    />
                    <span className="font-semibold text-ink-900 dark:text-ink-100 truncate">
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-ink-950 dark:text-ink-50">
                      {formatAmount(item.amount, item.currency)}
                    </span>
                    <span className="text-[11px] font-bold text-ink-500 bg-ink-100 dark:bg-ink-800 px-1.5 py-0.5 rounded-md">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeMode === "expenses"
                        ? "bg-gradient-to-r from-danger/80 to-danger"
                        : "bg-gradient-to-r from-positive/80 to-positive"
                    }`}
                    style={{ width: `${Math.max(2, Math.min(100, item.percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

