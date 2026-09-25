"use client";

import Link from "next/link";
import { Printer, ArrowLeft, ShieldCheck, CheckCircle2, DollarSign, Wallet, Calendar } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";

interface PrintableStatementProps {
  user: {
    fullName: string | null;
    email?: string | null;
    planName: string;
  };
  period: {
    monthLabel: string;
    generatedAtFormatted: string;
    documentRef: string;
  };
  defaultCurrency: string;
  totals: {
    totalIncomeReceived: number;
    totalIncomeExpected: number;
    totalExpensesPaid: number;
    totalExpensesPlanned: number;
    netRealBalance: number;
  };
  incomeRows: Array<{
    id: string;
    label: string;
    amount: number;
    currency: string;
    due_date: string;
    received: boolean;
    activity?: { name: string } | null;
  }>;
  expenseRows: Array<{
    id: string;
    label: string;
    category: string | null;
    amount: number;
    currency: string;
    due_date: string;
    paid: boolean;
    activity?: { name: string } | null;
  }>;
  scheduledExpenses: Array<{
    id: string;
    name: string;
    amount: number;
    currency: string;
    frequency: string;
    next_due_date: string;
    status: string;
  }>;
}

export function PrintableStatement({
  user,
  period,
  defaultCurrency,
  totals,
  incomeRows,
  expenseRows,
  scheduledExpenses,
}: PrintableStatementProps) {
  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 sm:px-6 print:p-0 print:bg-white text-slate-900">
      {/* Action Bar */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/finances"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux finances
        </Link>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Imprimer / Télécharger en PDF
        </button>
      </div>

      {/* Main Document (A4 format) */}
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full space-y-5 print:space-y-3">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b-2 border-slate-900 gap-3 print:pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-500 flex items-center justify-center font-extrabold text-lg shadow-sm print:bg-slate-900">
              RM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">REMIND ME</h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                  Relevé Financier
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Relevé officiel des flux de trésorerie &amp; encaissements</p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-0.5">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Relevé Mensuel
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Réf : <strong>{period.documentRef}</strong>
            </div>
            <div className="text-[10px] text-slate-500">
              Émis le : {period.generatedAtFormatted}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5 border-b border-slate-200 text-xs print:py-1.5">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Titulaire</span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{user.fullName || "Utilisateur Remind Me"}</p>
            <p className="text-slate-600 text-xs">{user.email || ""}</p>
          </div>
          <div className="sm:text-right">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Mois</span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{period.monthLabel}</p>
            <p className="text-slate-600 text-xs">Devise : <strong>{defaultCurrency}</strong></p>
          </div>
        </div>

        {/* Synthèse Balance */}
        <div className="grid grid-cols-3 gap-2.5 my-3 print:my-2">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white print:p-2.5">
            <div className="text-[10px] font-semibold text-slate-600">Total Encaissé</div>
            <div className="text-base sm:text-lg font-extrabold text-amber-700 mt-0.5">
              {formatAmount(totals.totalIncomeReceived, defaultCurrency)}
            </div>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white print:p-2.5">
            <div className="text-[10px] font-semibold text-slate-600">Total Dépenses</div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              {formatAmount(totals.totalExpensesPaid, defaultCurrency)}
            </div>
          </div>
          <div className="p-3 rounded-xl border-2 border-emerald-600/30 bg-emerald-50/40 print:bg-white print:p-2.5">
            <div className="text-[10px] font-bold text-emerald-900">Solde Net Réel</div>
            <div className="text-base sm:text-lg font-extrabold text-emerald-700 mt-0.5">
              {formatAmount(totals.netRealBalance, defaultCurrency)}
            </div>
          </div>
        </div>

        {/* Table: Revenus */}
        <div className="space-y-1.5 print:space-y-1" style={{ breakInside: "avoid" }}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">1. Encaissements &amp; Revenus du Mois</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs print:text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-1.5 px-3 print:py-1 print:px-2">Date</th>
                  <th className="py-1.5 px-3 print:py-1 print:px-2">Libellé</th>
                  <th className="py-1.5 px-3 print:py-1 print:px-2">Activité</th>
                  <th className="py-1.5 px-3 print:py-1 print:px-2 text-right">Montant</th>
                  <th className="py-1.5 px-3 print:py-1 print:px-2 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {incomeRows.length === 0 ? (
                  <tr><td colSpan={5} className="py-2.5 text-center text-slate-500 italic">Aucun revenu sur ce mois.</td></tr>
                ) : (
                  incomeRows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-slate-600 font-mono">{r.due_date}</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-900">{r.label}</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-slate-600">{r.activity?.name || "Général"}</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-bold text-amber-700">{formatAmount(r.amount, r.currency)}</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.received ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {r.received ? "Encaissé" : "En attente"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table: Dépenses */}
        <div className="space-y-1.5 print:space-y-1" style={{ breakInside: "avoid" }}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">2. Dépenses &amp; Sorties de Trésorerie</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs print:text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-1.5 px-3 print:py-1 print:px-2">Date</th>
                  <th className="py-1.5 px-3 print:py-1 print:px-2">Libellé</th>
                  <th className="py-1.5 px-3 print:py-1 print:px-2">Catégorie</th>
                  <th className="py-1.5 px-3 print:py-1 print:px-2 text-right">Montant</th>
                  <th className="py-1.5 px-3 print:py-1 print:px-2 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {expenseRows.length === 0 ? (
                  <tr><td colSpan={5} className="py-2.5 text-center text-slate-500 italic">Aucune dépense sur ce mois.</td></tr>
                ) : (
                  expenseRows.map((e) => (
                    <tr key={e.id}>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-slate-600 font-mono">{e.due_date}</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-900">{e.label}</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-slate-600">{e.category}</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-bold text-slate-900">{formatAmount(e.amount, e.currency)}</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.paid ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}`}>
                          {e.paid ? "Payée" : "Prévue"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Certification & Signature Remind Me */}
        <div className="mt-6 pt-4 border-t-2 border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:mt-4 print:pt-3" style={{ breakInside: "avoid" }}>
          <div className="space-y-0.5 max-w-md">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Sceau Officiel Remind Me
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Ce relevé est certifié conforme par les serveurs sécurisés Remind Me.
            </p>
          </div>

          <div className="p-2.5 rounded-xl border-2 border-dashed border-amber-600/40 bg-amber-50/30 text-center min-w-[170px] print:py-2">
            <div className="text-[9px] font-bold uppercase text-amber-900">
              Signature Électronique
            </div>
            <div className="my-0.5 font-serif italic text-amber-800 text-xs font-bold">
              Remind Me SaaS Verified
            </div>
            <div className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Certifié Conforme
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
