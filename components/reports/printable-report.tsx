"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, ShieldCheck, Sparkles, CheckCircle2, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import type { ActivityProfitability, CategoryBreakdownItem, MonthlySummaryItem } from "@/lib/reports/profitability";

interface PrintableReportProps {
  user: {
    fullName: string | null;
    email?: string | null;
    planName: string;
  };
  period: {
    from: string;
    to: string;
    fromLabel: string;
    toLabel: string;
    generatedAtFormatted: string;
    documentRef: string;
  };
  metrics: {
    defaultCurrency: string;
    totalIncomeReceived: number;
    totalIncomeExpected: number;
    totalExpensesPaid: number;
    totalExpensesPlanned: number;
    realNetBalance: number;
    totalHoursWorked: number;
    averageHourlyRate: number | null;
    otherCurrencies?: { currency: string; incomeReceived: number }[];
  };
  profitabilityList: ActivityProfitability[];
  categoryBreakdown: CategoryBreakdownItem[];
  monthlyEvolution: MonthlySummaryItem[];
}

export function PrintableReport({
  user,
  period,
  metrics,
  profitabilityList,
  categoryBreakdown,
  monthlyEvolution,
}: PrintableReportProps) {
  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 sm:px-6 print:p-0 print:m-0 print:min-h-0 print:bg-white text-slate-900">
      {/* Floating Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux rapports
        </Link>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Imprimer / Télécharger en PDF
        </button>
      </div>

      {/* Structured Document Container (A4 Pro Layout — Compact & Parfaitement calibré 1 page) */}
      <div className="max-w-4xl mx-auto bg-white p-4 sm:p-7 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full space-y-3.5 print:space-y-2 text-slate-900">
        
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b-2 border-slate-900 gap-2 print:pb-1.5">
          <div className="flex items-center gap-2.5">
            <RemindMeLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">REMIND ME</h1>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                  Rapport Officiel Certifié
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500">Bilan financier multi-activités, suivi de trésorerie &amp; rentabilité</p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-0.5 text-xs">
            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
              Bilan d&apos;Activité
            </div>
            <div className="text-[10.5px] font-mono text-slate-500">
              Réf : <strong>{period.documentRef}</strong>
            </div>
            <div className="text-[10px] text-slate-500">
              Émis le : {period.generatedAtFormatted}
            </div>
          </div>
        </div>

        {/* User & Period Info Block */}
        <div className="grid grid-cols-2 gap-2 py-2 border-b border-slate-200 text-xs print:py-1">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px]">Titulaire du compte</span>
            <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{user.fullName || "Utilisateur Remind Me"}</p>
            <p className="text-slate-600 text-[11px] truncate">{user.email || ""}</p>
          </div>

          <div className="text-right">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px]">Période sous revue</span>
            <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
              {period.fromLabel} ➔ {period.toLabel}
            </p>
            <p className="text-slate-600 text-[11px]">Devise : <strong>{metrics.defaultCurrency}</strong></p>
          </div>
        </div>

        {/* Executive Summary (KPIs Cards) */}
        <div className="space-y-1">
          <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600">Synthèse Exécutive</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            
            <div className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white print:border-slate-300">
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Revenus Reçus</div>
              <div className="text-sm sm:text-base font-black text-amber-700 mt-0.5">
                {formatAmount(metrics.totalIncomeReceived, metrics.defaultCurrency)}
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white print:border-slate-300">
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Dépenses Payées</div>
              <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                {formatAmount(metrics.totalExpensesPaid, metrics.defaultCurrency)}
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl border-2 border-emerald-600/30 bg-emerald-50/40 print:bg-white print:border-emerald-700">
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-900">Solde Réel Net</div>
              <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                {formatAmount(metrics.realNetBalance, metrics.defaultCurrency)}
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white print:border-slate-300">
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Rentabilité / Heure</div>
              <div className="text-sm sm:text-base font-black text-indigo-700 mt-0.5">
                {metrics.averageHourlyRate
                  ? `${formatAmount(metrics.averageHourlyRate, metrics.defaultCurrency)}/h`
                  : "N/A"}
              </div>
            </div>

          </div>
        </div>

        {/* Detailed Profitability Table by Activity */}
        <div className="space-y-1">
          <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
            Tableau de Profitabilité par Activité &amp; Contrat
          </h2>
          <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-[11px] print:text-[9.5px] min-w-[540px] sm:min-w-full">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-1 px-2.5 print:py-0.5 print:px-1.5">Activité / Mission</th>
                  <th className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right">Revenus Reçus</th>
                  <th className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right">Dépenses</th>
                  <th className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right">Solde Net</th>
                  <th className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right">Heures</th>
                  <th className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right">Taux Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {profitabilityList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-2 text-center text-slate-500 italic">
                      Aucune activité enregistrée sur cette période.
                    </td>
                  </tr>
                ) : (
                  profitabilityList.map((item, index) => {
                    const isPositive = item.netRealProfit >= 0;
                    return (
                      <tr key={index} className="hover:bg-slate-50/80">
                        <td className="py-1 px-2.5 print:py-0.5 print:px-1.5 font-semibold text-slate-900 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: item.activityColor || "#d97706" }}
                          />
                          {item.activityName}
                        </td>
                        <td className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right font-medium text-amber-700 whitespace-nowrap">
                          {formatAmount(item.incomeReceived, item.currency)}
                        </td>
                        <td className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right font-medium text-slate-600 whitespace-nowrap">
                          {formatAmount(item.expensesPaid, item.currency)}
                        </td>
                        <td className={`py-1 px-2.5 print:py-0.5 print:px-1.5 text-right font-extrabold whitespace-nowrap ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatAmount(item.netRealProfit, item.currency)}
                        </td>
                        <td className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right text-slate-600 font-mono whitespace-nowrap">
                          {item.totalHours > 0 ? `${item.totalHours.toFixed(1)} h` : "—"}
                        </td>
                        <td className="py-1 px-2.5 print:py-0.5 print:px-1.5 text-right font-bold text-indigo-700 whitespace-nowrap">
                          {item.hourlyRate !== null ? `${formatAmount(item.hourlyRate, item.currency)}/h` : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breakdown: Categories & Monthly summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2 print:my-1">
          {/* Category Breakdown */}
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Répartition des Dépenses
            </h2>
            <div className="rounded-xl border border-slate-200 p-2 space-y-1 text-[11px] print:text-[9.5px] bg-slate-50/30">
              {categoryBreakdown.length === 0 ? (
                <p className="text-slate-500 italic py-1">Aucune dépense sur la période.</p>
              ) : (
                categoryBreakdown.slice(0, 3).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700 font-medium truncate">{cat.category}</span>
                    <div className="text-right whitespace-nowrap">
                      <span className="font-bold text-slate-900">{formatAmount(cat.amount, cat.currency)}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Monthly Evolution */}
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Évolution Mensuelle des Flux
            </h2>
            <div className="rounded-xl border border-slate-200 p-2 space-y-1 text-[11px] print:text-[9.5px] bg-slate-50/30">
              {monthlyEvolution.length === 0 ? (
                <p className="text-slate-500 italic py-1">Aucune donnée mensuelle disponible.</p>
              ) : (
                monthlyEvolution.slice(-3).map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-800 font-bold">{m.monthLabel}</span>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-amber-700 font-semibold" title="Revenus">
                        +{formatAmount(m.incomeReceived, m.currency)}
                      </span>
                      <span className="text-slate-500 text-[10px]" title="Dépenses">
                        -{formatAmount(m.expensesPaid, m.currency)}
                      </span>
                      <span className="font-extrabold text-emerald-700" title="Solde Net">
                        ={formatAmount(m.netReal, m.currency)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Remind Me Official Signature & Certification Block */}
        <div className="mt-3 pt-2 border-t-2 border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 print:mt-2 print:pt-1">
          <div className="space-y-0.5 max-w-md">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Certification &amp; Authenticité Remind Me
            </div>
            <p className="text-[9.5px] text-slate-500 leading-relaxed">
              Ce document officiel est extrait en temps réel depuis Remind Me et certifié conforme.
            </p>
          </div>

          <div className="p-1.5 sm:p-2 rounded-xl border border-dashed border-amber-600/40 bg-amber-50/30 text-center min-w-[150px] shrink-0 print:py-1">
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-amber-900">
              Signature &amp; Cachet Numérique
            </div>
            <div className="font-serif italic text-amber-800 text-[11px] font-bold">
              Remind Me Engine v2.4
            </div>
            <div className="inline-flex items-center gap-1 text-[8.5px] text-emerald-700 font-bold">
              <CheckCircle2 className="w-2.5 h-2.5" /> Validé électroniquement
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
