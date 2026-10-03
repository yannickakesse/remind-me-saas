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
      {/* Grid view of activities with 3D hover pop effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((row, idx) => {
          const isProfit = row.netRealProfit >= 0;
          return (
            <div
              key={`act-card-${row.activityId ?? "none"}-${row.currency}-${idx}`}
              className={`group relative rounded-2xl border p-5 space-y-4 shadow-md backdrop-blur-xl transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl hover:scale-[1.01] ${
                isProfit
                  ? "bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-800 hover:border-gold/50"
                  : "bg-white/95 dark:bg-zinc-900/95 border-rose-300 dark:border-rose-900/50 hover:border-rose-500"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="h-4 w-4 rounded-full shrink-0 ring-2 ring-zinc-300 dark:ring-white/20 shadow-xs group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: row.activityColor ?? "#F59E0B" }}
                  />
                  <h4 className="font-extrabold text-zinc-950 dark:text-white text-sm truncate group-hover:text-signal transition-colors">
                    {row.activityName}
                  </h4>
                </div>

                {row.isTopPerformer ? (
                  <span className="rounded-full bg-gold-soft text-gold-dark text-[10px] font-extrabold px-2.5 py-0.5 shrink-0 inline-flex items-center gap-1 border border-gold/40 shadow-xs animate-pulse">
                    <Trophy className="w-3 h-3 text-gold-dark" /> Top Rentabilité
                  </span>
                ) : !isProfit ? (
                  <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-extrabold px-2 py-0.5 shrink-0 inline-flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                    <AlertTriangle className="w-3 h-3" /> En Perte
                  </span>
                ) : null}
              </div>

              {/* Card Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-black text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Encaissés
                  </span>
                  <div className="font-extrabold text-zinc-950 dark:text-white text-sm">
                    {formatAmount(row.incomeReceived, row.currency)}
                  </div>
                  {row.incomeExpected > 0 ? (
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      +{formatAmount(row.incomeExpected, row.currency)} attendus
                    </span>
                  ) : null}
                </div>

                <div className="space-y-0.5 text-right">
                  <span className="text-[10px] uppercase font-black text-zinc-600 dark:text-zinc-300 flex items-center justify-end gap-1">
                    <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Dépenses
                  </span>
                  <div className="font-extrabold text-zinc-950 dark:text-white text-sm">
                    {formatAmount(row.expensesPaid, row.currency)}
                  </div>
                  {row.expensesPlanned > 0 ? (
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      +{formatAmount(row.expensesPlanned, row.currency)} prévues
                    </span>
                  ) : null}
                </div>

                <div className="space-y-0.5 pt-1">
                  <span className="text-[10px] uppercase font-black text-zinc-600 dark:text-zinc-300">
                    Solde Réel (Net)
                  </span>
                  <div
                    className={`font-black text-sm ${
                      isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400 font-black"
                    }`}
                  >
                    {formatAmount(row.netRealProfit, row.currency)}
                  </div>
                </div>

                <div className="space-y-0.5 text-right pt-1">
                  <span className="text-[10px] uppercase font-black text-zinc-600 dark:text-zinc-300 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3 text-signal" /> Rentabilité / h
                  </span>
                  <div>
                    {row.hourlyRate !== null ? (
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-xs font-black shadow-xs ${
                          row.hourlyRate >= 0
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                        }`}
                      >
                        {formatAmount(row.hourlyRate, row.currency)}/h
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
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

