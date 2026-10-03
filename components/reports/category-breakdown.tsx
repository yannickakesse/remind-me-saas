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
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-md">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3.5">
        <div>
          <h3 className="font-extrabold text-zinc-950 dark:text-white text-base flex items-center gap-2">
            <PieChart className="w-4 h-4 text-signal" />
            Répartition par Catégorie
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 font-medium">
            {activeMode === "expenses"
              ? "Identifiez les postes qui consomment le plus de trésorerie"
              : "Identifiez les activités & sources qui génèrent le plus de revenus"}
          </p>
        </div>

        {/* Toggle Mode Buttons */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setActiveMode("expenses")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "expenses"
                ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs"
                : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Dépenses ({effectiveExpenseItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("income")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "income"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
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
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span className="font-bold text-zinc-900 dark:text-white truncate">
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-zinc-950 dark:text-white">
                      {formatAmount(item.amount, item.currency)}
                    </span>
                    <span className="text-[11px] font-black text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded-md">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
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

