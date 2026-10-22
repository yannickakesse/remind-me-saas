"use client";

import { Trophy, AlertTriangle, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import type { ActivityProfitability } from "@/lib/reports/profitability";

export function ProfitabilityTable({ items }: { items: ActivityProfitability[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 dark:border-ink-800 bg-canvas-raised/50 p-8 text-center text-sm text-ink-500">
        Aucune donnée d'activité disponible sur la période sélectionnée.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Grid view of activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {items.map((row, idx) => {
          const isProfit = row.netRealProfit >= 0;
          return (
            <div
              key={`act-card-${row.activityId ?? "none"}-${row.currency}-${idx}`}
              className={`group relative rounded-3xl border p-5 space-y-4 shadow-xs transition-colors ${
                isProfit
                  ? "bg-canvas-raised dark:bg-slate-900 border-ink-200/90 dark:border-ink-800/90 hover:border-signal/40"
                  : "bg-canvas-raised dark:bg-slate-900 border-danger/40 hover:border-danger/60"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-ink-200 dark:ring-ink-700 shadow-xs"
                    style={{ backgroundColor: row.activityColor ?? "#D97706" }}
                  />
                  <h4 className="font-bold text-ink-950 dark:text-white text-sm truncate group-hover:text-signal transition-colors">
                    {row.activityName}
                  </h4>
                </div>

                {row.isTopPerformer ? (
                  <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2.5 py-0.5 shrink-0 inline-flex items-center gap-1 border border-amber-300 dark:border-amber-800 shadow-2xs">
                    <Trophy className="w-3 h-3 text-amber-600" /> Top Rentabilité
                  </span>
                ) : !isProfit ? (
                  <span className="rounded-full bg-danger-soft text-danger text-[10px] font-bold px-2 py-0.5 shrink-0 inline-flex items-center gap-1 border border-danger/30">
                    <AlertTriangle className="w-3 h-3" /> En Perte
                  </span>
                ) : null}
              </div>

              {/* Card Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-ink-100 dark:border-ink-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-ink-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-positive" /> Encaissés
                  </span>
                  <div className="font-bold font-mono tabular-nums text-ink-950 dark:text-white text-sm">
                    {formatAmount(row.incomeReceived, row.currency)}
                  </div>
                  {row.incomeExpected > 0 ? (
                    <span className="text-[10px] font-medium text-ink-500">
                      +{formatAmount(row.incomeExpected, row.currency)} attendus
                    </span>
                  ) : null}
                </div>

                <div className="space-y-0.5 text-right">
                  <span className="text-[10px] uppercase font-bold text-ink-500 flex items-center justify-end gap-1">
                    <TrendingDown className="w-3 h-3 text-danger" /> Dépenses
                  </span>
                  <div className="font-bold font-mono tabular-nums text-ink-950 dark:text-white text-sm">
                    {formatAmount(row.expensesPaid, row.currency)}
                  </div>
                  {row.expensesPlanned > 0 ? (
                    <span className="text-[10px] font-medium text-ink-500">
                      +{formatAmount(row.expensesPlanned, row.currency)} prévues
                    </span>
                  ) : null}
                </div>

                <div className="space-y-0.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-ink-500">
                    Solde Réel (Net)
                  </span>
                  <div
                    className={`font-bold font-mono tabular-nums text-sm ${
                      isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-danger"
                    }`}
                  >
                    {formatAmount(row.netRealProfit, row.currency)}
                  </div>
                </div>

                <div className="space-y-0.5 text-right pt-1">
                  <span className="text-[10px] uppercase font-bold text-ink-500 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3 text-signal" /> Rentabilité / h
                  </span>
                  <div>
                    {row.hourlyRate !== null ? (
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold font-mono tabular-nums shadow-2xs ${
                          row.hourlyRate >= 0
                            ? "bg-positive-soft text-positive border border-positive/30"
                            : "bg-danger-soft text-danger border border-danger/30"
                        }`}
                      >
                        {formatAmount(row.hourlyRate, row.currency)}/h
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-ink-500">
                        {row.totalHours > 0 ? `${row.totalHours} h passées` : "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

