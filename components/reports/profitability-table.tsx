"use client";

import { formatAmount } from "@/lib/finances/format";
import type { ActivityProfitability } from "@/lib/reports/profitability";

export function ProfitabilityTable({ items }: { items: ActivityProfitability[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/50 p-8 text-center text-sm text-ink-500">
        Aucune donnée d'activité disponible sur la période sélectionnée.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200 bg-canvas-raised">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-canvas text-xs uppercase tracking-wider text-ink-500">
            <th className="px-4 py-3 font-semibold">Activité</th>
            <th className="px-4 py-3 font-semibold text-right">Revenus</th>
            <th className="px-4 py-3 font-semibold text-right">Dépenses directes</th>
            <th className="px-4 py-3 font-semibold text-right">Bénéfice Net</th>
            <th className="px-4 py-3 font-semibold text-right">Heures passées</th>
            <th className="px-4 py-3 font-semibold text-right">Rentabilité / Heure</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((row, idx) => {
            const isProfit = row.netProfit >= 0;
            return (
              <tr key={`${row.activityId ?? "none"}-${row.currency}-${idx}`} className="hover:bg-canvas/40 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: row.activityColor ?? "#1E3A5F" }}
                    />
                    <span className="font-semibold text-ink-950">{row.activityName}</span>
                    {row.isTopPerformer ? (
                      <span className="rounded-full bg-warning-soft text-warning text-xs font-bold px-2 py-0.5 ml-1">
                        🏆 Top Rentabilité
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right font-medium text-ink-950">
                  {formatAmount(row.totalIncome, row.currency)}
                </td>
                <td className="px-4 py-3.5 text-right text-ink-600">
                  {formatAmount(row.totalExpenses, row.currency)}
                </td>
                <td
                  className={`px-4 py-3.5 text-right font-bold ${
                    isProfit ? "text-positive" : "text-danger"
                  }`}
                >
                  {formatAmount(row.netProfit, row.currency)}
                </td>
                <td className="px-4 py-3.5 text-right text-ink-700">
                  {row.totalHours > 0 ? `${row.totalHours} h` : "—"}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {row.hourlyRate !== null ? (
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                        row.hourlyRate >= 0
                          ? "bg-positive-soft text-positive border border-positive/30"
                          : "bg-danger-soft text-danger border border-danger/30"
                      }`}
                    >
                      {formatAmount(row.hourlyRate, row.currency)} / h
                    </span>
                  ) : (
                    <span className="text-xs text-ink-400">Heures non saisies</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
