"use client";

import { formatAmount } from "@/lib/finances/format";
import type { MonthlySummaryItem } from "@/lib/reports/profitability";

export function MonthlyEvolution({ items }: { items: MonthlySummaryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/50 p-6 text-center text-xs text-ink-500">
        Pas assez de données pour afficher l'historique mensuel.
      </div>
    );
  }

  const maxIncome = Math.max(...items.map((i) => i.income), 1);

  return (
    <div className="rounded-xl border border-ink-200 bg-canvas-raised p-5 space-y-4">
      <h3 className="font-bold text-ink-950 text-base">Évolution Mensuelle (Revenus vs Dépenses)</h3>
      <div className="space-y-4 pt-1">
        {items.map((m) => {
          const incPct = Math.round((m.income / maxIncome) * 100);
          const expPct = Math.round((m.expenses / maxIncome) * 100);

          return (
            <div key={`${m.monthKey}-${m.currency}`} className="space-y-1.5 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-ink-900">{m.monthLabel}</span>
                <span className={m.net >= 0 ? "text-positive" : "text-danger"}>
                  Net : {formatAmount(m.net, m.currency)}
                </span>
              </div>

              {/* Barres comparatives */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-ink-500 text-[10px]">Revenus</span>
                  <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div className="h-full bg-positive rounded-full" style={{ width: `${incPct}%` }} />
                  </div>
                  <span className="w-24 text-right font-medium text-ink-800">{formatAmount(m.income, m.currency)}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-ink-500 text-[10px]">Dépenses</span>
                  <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div className="h-full bg-danger rounded-full" style={{ width: `${expPct}%` }} />
                  </div>
                  <span className="w-24 text-right font-medium text-ink-800">{formatAmount(m.expenses, m.currency)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
