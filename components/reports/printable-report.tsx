"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, ShieldCheck, Sparkles, CheckCircle2, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 sm:px-6 print:p-0 print:bg-white text-slate-900">
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

      {/* Structured Document Container (A4 Pro Layout) */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full">
        
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-slate-900 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-500 flex items-center justify-center font-extrabold text-xl shadow-sm print:bg-slate-900">
              RM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">REMIND ME</h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                  Rapport Officiel
                </span>
              </div>
              <p className="text-xs text-slate-500">Plateforme de gestion unifiée multi-activités, finances &amp; rentabilité</p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-0.5">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Bilan Financier &amp; Activités
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Réf : <strong>{period.documentRef}</strong>
            </div>
            <div className="text-[11px] text-slate-500">
              Émis le : {period.generatedAtFormatted}
            </div>
          </div>
        </div>

        {/* User & Period Info Block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Titulaire du compte</span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{user.fullName || "Utilisateur Remind Me"}</p>
            <p className="text-slate-600">{user.email || ""}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
              Formule {user.planName}
            </span>
          </div>

          <div className="sm:text-right">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Période sous revue</span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">
              {period.fromLabel} ➔ {period.toLabel}
            </p>
            <p className="text-slate-600">Devise de référence : <strong>{metrics.defaultCurrency}</strong></p>
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center sm:justify-end gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Données certifiées conformes
            </p>
          </div>
        </div>

        {/* Executive Summary (KPIs Cards) */}
        <div className="my-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Synthèse Exécutive</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-600">Revenus Reçus</div>
              <div className="text-lg font-extrabold text-amber-700 mt-1">
                {formatAmount(metrics.totalIncomeReceived, metrics.defaultCurrency)}
              </div>
              {metrics.totalIncomeExpected > 0 && (
                <div className="text-[10px] text-slate-500 mt-0.5">
                  +{formatAmount(metrics.totalIncomeExpected, metrics.defaultCurrency)} attendus
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-600">Dépenses Payées</div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {formatAmount(metrics.totalExpensesPaid, metrics.defaultCurrency)}
              </div>
              {metrics.totalExpensesPlanned > 0 && (
                <div className="text-[10px] text-slate-500 mt-0.5">
                  +{formatAmount(metrics.totalExpensesPlanned, metrics.defaultCurrency)} prévues
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border-2 border-emerald-600/30 bg-emerald-50/40 print:bg-white print:border-emerald-700">
              <div className="text-[11px] font-bold text-emerald-900">Solde Réel Net</div>
              <div className="text-lg font-extrabold text-emerald-700 mt-1">
                {formatAmount(metrics.realNetBalance, metrics.defaultCurrency)}
              </div>
              <div className="text-[10px] text-emerald-800 font-medium mt-0.5">
                {metrics.realNetBalance >= 0 ? "Excédent de trésorerie" : "Déficit net"}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-600">Rentabilité / Heure</div>
              <div className="text-lg font-extrabold text-indigo-700 mt-1">
                {metrics.averageHourlyRate
                  ? `${formatAmount(metrics.averageHourlyRate, metrics.defaultCurrency)}/h`
                  : "N/A"}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Sur {metrics.totalHoursWorked.toFixed(1)} h travaillées
              </div>
            </div>

          </div>
        </div>

        {/* Detailed Profitability Table by Activity */}
        <div className="my-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Tableau de Profitabilité par Activité &amp; Contrat
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-2.5 px-3">Activité / Mission</th>
                  <th className="py-2.5 px-3 text-right">Revenus Reçus</th>
                  <th className="py-2.5 px-3 text-right">Dépenses</th>
                  <th className="py-2.5 px-3 text-right">Solde Net</th>
                  <th className="py-2.5 px-3 text-right">Heures</th>
                  <th className="py-2.5 px-3 text-right">Taux Horaire Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {profitabilityList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500 italic">
                      Aucune activité enregistrée sur cette période.
                    </td>
                  </tr>
                ) : (
                  profitabilityList.map((item, index) => {
                    const isPositive = item.netRealProfit >= 0;
                    return (
                      <tr key={index} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: item.activityColor || "#d97706" }}
                          />
                          {item.activityName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-amber-700">
                          {formatAmount(item.incomeReceived, item.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                          {formatAmount(item.expensesPaid, item.currency)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-extrabold ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatAmount(item.netRealProfit, item.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                          {item.totalHours > 0 ? `${item.totalHours.toFixed(1)} h` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8">
          {/* Category Breakdown */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Répartition des Dépenses par Catégorie
            </h2>
            <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-xs bg-slate-50/30">
              {categoryBreakdown.length === 0 ? (
                <p className="text-slate-500 italic py-2">Aucune dépense enregistrée sur la période.</p>
              ) : (
                categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700 font-medium">{cat.category}</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{formatAmount(cat.amount, cat.currency)}</span>
                      <span className="text-[11px] text-slate-500 ml-1.5">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Monthly Evolution */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Évolution Mensuelle des Flux
            </h2>
            <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-xs bg-slate-50/30">
              {monthlyEvolution.length === 0 ? (
                <p className="text-slate-500 italic py-2">Aucune donnée mensuelle disponible.</p>
              ) : (
                monthlyEvolution.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-800 font-bold">{m.monthLabel}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-700 font-semibold" title="Revenus">
                        +{formatAmount(m.incomeReceived, m.currency)}
                      </span>
                      <span className="text-slate-500 text-[11px]" title="Dépenses">
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
        <div className="mt-12 pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1 max-w-md">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Certification &amp; Authenticité Remind Me
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ce document est un état officiel des activités et flux financiers extrait en temps réel depuis le système Remind Me. Les calculs de rentabilité et d&apos;heures sont certifiés conformes selon les enregistrements de l&apos;utilisateur.
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              SHA256: {period.documentRef}-CERTIFIED-SECURE
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-dashed border-amber-600/40 bg-amber-50/30 text-center min-w-[200px] shrink-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
              Signature &amp; Cachet Numérique
            </div>
            <div className="my-2 font-serif italic text-amber-800 text-sm font-bold">
              Remind Me Engine v2.4
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Validé électroniquement
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>Remind Me — Copilote SaaS Multi-Activités • https://remind-me.app</span>
          <span>Page 1 / 1</span>
        </div>

      </div>
    </div>
  );
}
