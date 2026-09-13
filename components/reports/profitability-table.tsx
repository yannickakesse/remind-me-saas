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
    <div className="w-full min-w-0">
      {/* Version Mobile (< 768px) : Cartes d'activités & rentabilité */}
      <div className="block md:hidden space-y-3">
        {items.map((row, idx) => {
          const isProfit = row.netProfit >= 0;
          return (
            <div
              key={`mobile-${row.activityId ?? "none"}-${row.currency}-${idx}`}
              className="rounded-xl border border-ink-200 bg-canvas-raised p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: row.activityColor ?? "#1E3A5F" }}
                  />
                  <h4 className="font-bold text-ink-950 text-sm truncate">{row.activityName}</h4>
                </div>
                {row.isTopPerformer ? (
                  <span className="rounded-full bg-warning-soft text-warning text-[10px] font-bold px-2 py-0.5 shrink-0">
                    🏆 Top Rentabilité
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-ink-100">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-ink-500">Revenus</span>
                  <div className="font-semibold text-ink-950">
                    {formatAmount(row.totalIncome, row.currency)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-ink-500">Dépenses</span>
                  <div className="font-medium text-ink-600">
                    {formatAmount(row.totalExpenses, row.currency)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-ink-500">Bénéfice Net</span>
                  <div className={`font-bold ${isProfit ? "text-positive" : "text-danger"}`}>
                    {formatAmount(row.netProfit, row.currency)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-ink-500">Rentabilité / h</span>
                  <div>
                    {row.hourlyRate !== null ? (
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-extrabold ${
                          row.hourlyRate >= 0
                            ? "bg-positive-soft text-positive"
                            : "bg-danger-soft text-danger"
                        }`}
                      >
                        {formatAmount(row.hourlyRate, row.currency)}/h
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink-400">
                        {row.totalHours > 0 ? `${row.totalHours}h (taux non calculable)` : "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Version Desktop (>= 768px) : Tableau complet */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-ink-200 bg-canvas-raised">
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
    </div>
  );
}
