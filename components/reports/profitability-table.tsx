"use client";

import { Trophy } from "lucide-react";
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
          const isProfit = row.netRealProfit >= 0;
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
                  <span className="rounded-full bg-gold-soft text-gold-dark text-[10px] font-bold px-2 py-0.5 shrink-0 inline-flex items-center gap-1 border border-gold/30">
                    <Trophy className="w-3 h-3 text-gold-dark" /> Top Rentabilité
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-ink-100">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-ink-500">Reçus (Encaissés)</span>
                  <div className="font-semibold text-ink-950">
                    {formatAmount(row.incomeReceived, row.currency)}
                  </div>
                  {row.incomeExpected > 0 ? (
                    <span className="text-[10px] text-ink-400">+{formatAmount(row.incomeExpected, row.currency)} attendus</span>
                  ) : null}
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-ink-500">Dépenses Payées</span>
                  <div className="font-medium text-ink-600">
                    {formatAmount(row.expensesPaid, row.currency)}
                  </div>
                  {row.expensesPlanned > 0 ? (
                    <span className="text-[10px] text-ink-400">+{formatAmount(row.expensesPlanned, row.currency)} prévues</span>
                  ) : null}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-ink-500">Solde Réel</span>
                  <div className={`font-bold ${isProfit ? "text-positive" : "text-danger"}`}>
                    {formatAmount(row.netRealProfit, row.currency)}
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
                        {row.totalHours > 0 ? `${row.totalHours}h` : "—"}
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
              <th className="px-4 py-3 font-semibold text-right">Revenus Reçus</th>
              <th className="px-4 py-3 font-semibold text-right">Dépenses Payées</th>
              <th className="px-4 py-3 font-semibold text-right">Solde Réel (Net)</th>
              <th className="px-4 py-3 font-semibold text-right">Heures passées</th>
              <th className="px-4 py-3 font-semibold text-right">Rentabilité / Heure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {items.map((row, idx) => {
              const isProfit = row.netRealProfit >= 0;
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
                        <span className="rounded-full bg-gold-soft text-gold-dark text-xs font-bold px-2 py-0.5 ml-1 inline-flex items-center gap-1 border border-gold/30">
                          <Trophy className="w-3.5 h-3.5 text-gold-dark" /> Top Rentabilité
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-ink-950">
                    <div>{formatAmount(row.incomeReceived, row.currency)}</div>
                    {row.incomeExpected > 0 ? (
                      <div className="text-[11px] text-ink-400 font-normal">+{formatAmount(row.incomeExpected, row.currency)} attendus</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 text-right text-ink-600">
                    <div>{formatAmount(row.expensesPaid, row.currency)}</div>
                    {row.expensesPlanned > 0 ? (
                      <div className="text-[11px] text-ink-400 font-normal">+{formatAmount(row.expensesPlanned, row.currency)} prévues</div>
                    ) : null}
                  </td>
                  <td
                    className={`px-4 py-3.5 text-right font-bold ${
                      isProfit ? "text-positive" : "text-danger"
                    }`}
                  >
                    {formatAmount(row.netRealProfit, row.currency)}
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
