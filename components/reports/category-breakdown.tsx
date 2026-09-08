"use client";

import { formatAmount } from "@/lib/finances/format";
import { expenseCategoryLabel } from "@/lib/validation/finances";
import type { CategoryBreakdownItem } from "@/lib/reports/profitability";

export function CategoryBreakdown({ items }: { items: CategoryBreakdownItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/50 p-6 text-center text-xs text-ink-500">
        Aucune dépense enregistrée sur cette période.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-canvas-raised p-5 space-y-3.5">
      <h3 className="font-bold text-ink-950 text-base">Répartition des Dépenses par Catégorie</h3>
      <div className="space-y-3 pt-1">
        {items.map((cat) => (
          <div key={cat.category} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink-900">{expenseCategoryLabel(cat.category)}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink-950">{formatAmount(cat.amount, cat.currency)}</span>
                <span className="text-ink-400">({cat.percentage}%)</span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-signal transition-all duration-300"
                style={{ width: `${cat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
