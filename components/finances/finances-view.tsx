"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Plus,
  ArrowRight,
  Download,
  Printer,
  Calendar,
  Check,
  Loader2,
} from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { FinanceTabs, FinanceTab } from "./finance-tabs";
import { BudgetsSection } from "./budgets-section";
import { SavingsGoalsSection } from "./savings-goals-section";
import { ScheduledExpensesSection } from "./scheduled-expenses-section";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/language-provider";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";
import { setIncomeReceived, postponeIncomeAction, setExpensePaid } from "@/app/(app)/finances/actions";
import { openQuickTransaction } from "@/components/finances/quick-transaction-modal";

interface FinancesViewProps {
  initialTab: FinanceTab;
  aggregates: {
    totalIncomeReceived: number;
    totalIncomePending: number;
    totalExpensesPaid: number;
    netBalance: number;
  };
  incomeRows: any[];
  expenseRows: any[];
  budgetsWithSpent: any[];
  savingsGoals: any[];
  scheduledExpenses: any[];
  activities: Array<{ id: string; name: string }>;
  currenciesList: Array<{ code: string; symbol: string }>;
  defaultCurrency: string;
  rangeStart: string;
  rangeEnd: string;
}

export function FinancesView({
  initialTab,
  aggregates: initialAggregates,
  incomeRows: initialIncomeRows,
  expenseRows: initialExpenseRows,
  budgetsWithSpent,
  savingsGoals,
  scheduledExpenses,
  activities,
  currenciesList,
  defaultCurrency,
  rangeStart,
  rangeEnd,
}: FinancesViewProps) {
  const toast = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);
  const [incomes, setIncomes] = useState<any[]>(initialIncomeRows);
  const [expenses, setExpenses] = useState<any[]>(initialExpenseRows ?? []);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setIncomes(initialIncomeRows);
  }, [initialIncomeRows]);

  useEffect(() => {
    setExpenses(initialExpenseRows ?? []);
  }, [initialExpenseRows]);

  const handleTabChange = useCallback((tab: FinanceTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "overview") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  // Calcul dynamique des agrégats pour réactivité immédiate à 0ms
  const totalIncomeReceived = incomes
    .filter((i) => i.received)
    .reduce((acc, i) => acc + Number(i.amount), 0);
  const totalIncomePending = incomes
    .filter((i) => !i.received)
    .reduce((acc, i) => acc + Number(i.amount), 0);
  const totalExpensesPaid = expenses
    .filter((e) => e.paid)
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const totalExpensesPending = expenses
    .filter((e) => !e.paid)
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const netBalance = totalIncomeReceived - totalExpensesPaid;

  async function handleToggleIncomeReceived(id: string, currentlyReceived: boolean) {
    if (actionLoadingId) return;
    setActionLoadingId(id);
    const newStatus = !currentlyReceived;
    const today = new Date().toISOString().slice(0, 10);

    // Mise à jour optimiste immédiate (0ms)
    setIncomes((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, received: newStatus, received_at: newStatus ? today : null }
          : i
      )
    );

    try {
      await setIncomeReceived(id, newStatus);
      toast.push(
        newStatus
          ? "Revenu encaissé avec succès ! Solde net mis à jour."
          : "Revenu remis en attente.",
        "success"
      );
    } catch (err) {
      setIncomes(initialIncomeRows);
      toast.push("Erreur lors de la mise à jour du revenu.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleToggleExpensePaid(id: string, currentlyPaid: boolean) {
    if (actionLoadingId) return;
    setActionLoadingId(id);
    const newStatus = !currentlyPaid;
    const today = new Date().toISOString().slice(0, 10);

    // Mise à jour optimiste immédiate (0ms)
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, paid: newStatus, paid_at: newStatus ? today : null }
          : e
      )
    );

    try {
      await setExpensePaid(id, newStatus);
      toast.push(
        newStatus
          ? "Dépense marquée comme payée ! Solde net actualisé."
          : "Dépense remise en attente de règlement.",
        "success"
      );
    } catch (err) {
      setExpenses(initialExpenseRows ?? []);
      toast.push("Erreur lors de la mise à jour de la dépense.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handlePostponeIncome(id: string) {
    if (actionLoadingId) return;
    setActionLoadingId(id);
    try {
      await postponeIncomeAction(id, 7);
      toast.push("Échéance de revenu reportée de 7 jours.", "info");
    } catch (err) {
      toast.push("Erreur lors du report.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  const hasNoData =
    (incomes ?? []).length === 0 &&
    (expenses ?? []).length === 0 &&
    (scheduledExpenses ?? []).length === 0 &&
    (budgetsWithSpent ?? []).length === 0 &&
    (savingsGoals ?? []).length === 0;

  return (
    <div className="relative isolate min-h-full w-full space-y-5 max-w-7xl mx-auto min-w-0">
      {/* Header avec bannière visuelle retravaillée */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md p-5 sm:p-7 shadow-xs" data-tour="finance-header">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50 truncate flex items-center gap-2.5">
              <span className="bg-gradient-to-r from-gold to-gold-dark text-white p-2 rounded-xl shadow-gold-subtle inline-flex">
                <Wallet className="w-5 h-5" />
              </span>
              {t("finances.title")}
            </h1>
            <p className="text-xs text-ink-500 mt-1">
              {t("finances.subtitle")}
            </p>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2.5 flex-wrap shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <SectionGuideTrigger section="finances" label="Guide financier" />
            <Link
              href={`/finances/print?month=${rangeStart.slice(0, 7)}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 h-10 rounded-xl bg-canvas border border-ink-300 dark:border-ink-700 text-xs sm:text-sm font-semibold text-ink-900 dark:text-ink-100 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors shadow-xs flex-1 sm:flex-initial"
              title="Imprimer ou enregistrer le relevé en PDF"
            >
              <Printer className="w-4 h-4 text-signal shrink-0" /> {t("finances.pdf_statement")}
            </Link>
            <a
              href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
              download
              data-tour="finance-export"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 h-10 rounded-xl bg-canvas border border-ink-300 dark:border-ink-700 text-xs sm:text-sm font-semibold text-ink-900 dark:text-ink-100 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors shadow-xs flex-1 sm:flex-initial"
              title="Exporter les données financières au format CSV"
            >
              <Download className="w-4 h-4 mr-1 shrink-0" /> {t("finances.export_csv")}
            </a>
            <Link
              href="/finances/income/new"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  openQuickTransaction("income");
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 h-10 rounded-xl bg-signal text-white text-xs sm:text-sm font-bold hover:bg-signal/90 transition-colors shadow-xs flex-1 sm:flex-initial"
            >
              <Plus className="w-4 h-4 mr-1 shrink-0" /> {t("finances.add_income")}
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs avec basculement instantané à 0ms */}
      <div data-tour="finances-tabs">
        <FinanceTabs currentTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Tab: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-5 w-full min-w-0 animate-in fade-in-50 duration-150">
          {/* 4 Cartes Principales de la Vue Globale */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0" data-tour="finances-kpi">
            <StatCard
              label={t("finances.kpi_pending")}
              value={formatAmount(totalIncomePending, defaultCurrency)}
              helper={t("finances.kpi_pending_helper")}
              tone="warning"
              icon={Clock}
              dataTour="finance-pending-revenue"
            />
            <StatCard
              label={t("finances.kpi_received")}
              value={formatAmount(totalIncomeReceived, defaultCurrency)}
              helper={t("finances.kpi_received_helper")}
              tone="positive"
              icon={TrendingUp}
              dataTour="finance-received-revenue"
            />
            <StatCard
              label={t("finances.kpi_paid")}
              value={formatAmount(totalExpensesPaid, defaultCurrency)}
              helper={t("finances.kpi_paid_helper")}
              tone="danger"
              icon={TrendingDown}
              dataTour="finance-paid-expenses"
            />
            <StatCard
              label={t("finances.kpi_net")}
              value={formatAmount(netBalance, defaultCurrency)}
              helper={t("finances.kpi_net_helper")}
              tone={netBalance >= 0 ? "positive" : "danger"}
              icon={Wallet}
              dataTour="finance-net-balance"
            />
          </div>

          {/* Si utilisateur nouveau sans aucune donnée financière */}
          {hasNoData && (
            <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised p-6 sm:p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gold-soft text-gold-dark flex items-center justify-center mx-auto shadow-xs">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-ink-950">Aucune donnée financière pour le moment</h3>
              <p className="text-xs text-ink-500 max-w-md mx-auto">
                Toutes les métriques affichées proviennent de vos transactions réelles. Ajoutez votre premier revenu ou programmez votre première dépense pour commencer le suivi.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/finances/income/new"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                      e.preventDefault();
                      openQuickTransaction("income");
                    }
                  }}
                  className={buttonClasses("primary", "sm")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Enregistrer un premier revenu
                </Link>
                <button
                  type="button"
                  onClick={() => handleTabChange("scheduled")}
                  className={buttonClasses("secondary", "sm")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Programmer une dépense
                </button>
              </div>
            </div>
          )}

          {/* Quick Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
            {/* Prochains encaissements */}
            <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-ink-950 flex items-center gap-1.5 truncate">
                  <TrendingUp className="w-4 h-4 text-positive" /> Prochains Revenus
                </h3>
                <button
                  type="button"
                  onClick={() => handleTabChange("income")}
                  className="text-xs font-semibold text-signal hover:underline shrink-0 flex items-center gap-0.5"
                >
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {(incomes ?? []).filter((i) => !i.received).slice(0, 4).length === 0 ? (
                <div className="py-6 text-center space-y-2 rounded-lg bg-canvas border border-ink-100">
                  <p className="text-xs text-ink-500">Aucun revenu en attente ce mois-ci</p>
                  <Link
                    href="/finances/income/new"
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                        e.preventDefault();
                        openQuickTransaction("income");
                      }
                    }}
                    className="inline-flex items-center text-xs font-semibold text-signal hover:underline"
                  >
                    + Ajouter un revenu
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {(incomes ?? []).filter((i) => !i.received).slice(0, 4).map((inc) => (
                    <div key={inc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-canvas text-xs gap-2 min-w-0 border border-ink-100">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink-900 truncate" title={inc.label}>
                          {inc.label}
                        </div>
                        <div className="text-[10px] text-ink-500 truncate">
                          Échéance : {inc.due_date}
                        </div>
                      </div>
                      <div className="font-bold text-ink-950 shrink-0 text-right">
                        {formatAmount(inc.amount, inc.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dépenses programmées à venir */}
            <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-ink-950 flex items-center gap-1.5 truncate">
                  <Clock className="w-4 h-4 text-amber-600" /> Dépenses Programmées
                </h3>
                <button
                  type="button"
                  onClick={() => handleTabChange("scheduled")}
                  className="text-xs font-semibold text-signal hover:underline shrink-0 flex items-center gap-0.5"
                >
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {(scheduledExpenses ?? []).filter((s) => s.status === "planned" || s.status === "due").slice(0, 4).length === 0 ? (
                <div className="py-6 text-center space-y-2 rounded-lg bg-canvas border border-ink-100">
                  <p className="text-xs text-ink-500">Aucune charge ou abonnement programmé</p>
                  <button
                    type="button"
                    onClick={() => handleTabChange("scheduled")}
                    className="inline-flex items-center text-xs font-semibold text-signal hover:underline"
                  >
                    + Programmer une dépense
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(scheduledExpenses ?? []).filter((s) => s.status === "planned" || s.status === "due").slice(0, 4).map((sc) => (
                    <div key={sc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-canvas text-xs gap-2 min-w-0 border border-ink-100">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink-900 truncate" title={sc.name}>
                          {sc.name}
                        </div>
                        <div className="text-[10px] text-ink-500 truncate">
                          Échéance : {sc.next_due_date}
                        </div>
                      </div>
                      <div className="font-bold text-ink-950 shrink-0 text-right">
                        {formatAmount(sc.amount, sc.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: SCHEDULED EXPENSES */}
      {activeTab === "scheduled" && (
        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md p-5 sm:p-7 shadow-sm animate-in fade-in-50 duration-150">
          <ScheduledExpensesSection
            scheduledExpenses={scheduledExpenses}
            defaultCurrency={defaultCurrency}
            activities={activities}
          />
        </div>
      )}

      {/* Tab: BUDGETS */}
      {activeTab === "budgets" && (
        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md p-5 sm:p-7 shadow-sm animate-in fade-in-50 duration-150">
          <BudgetsSection
            budgets={budgetsWithSpent}
            currencies={currenciesList}
            defaultCurrency={defaultCurrency}
          />
        </div>
      )}

      {/* Tab: SAVINGS */}
      {activeTab === "savings" && (
        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md p-5 sm:p-7 shadow-sm animate-in fade-in-50 duration-150">
          <SavingsGoalsSection
            goals={savingsGoals}
            currencies={currenciesList}
            defaultCurrency={defaultCurrency}
          />
        </div>
      )}

      {/* Tab: INCOME */}
      {activeTab === "income" && (
        <div className="p-5 sm:p-7 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md space-y-4 min-w-0 animate-in fade-in-50 duration-150 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-ink-950 dark:text-white truncate">Revenus du mois</h3>
              <p className="text-xs text-ink-500">
                Encaissez vos paiements reçus pour les intégrer à votre Total reçu et Solde net.
              </p>
            </div>
            <Link
              href="/finances/income/new"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  openQuickTransaction("income");
                }
              }}
              className={buttonClasses("primary", "sm")}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau revenu
            </Link>
          </div>

          {(incomes ?? []).length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 space-y-3">
              <div className="w-10 h-10 rounded-full bg-positive-soft text-positive flex items-center justify-center mx-auto">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="font-semibold text-ink-950 dark:text-white text-sm">Aucun revenu pour ce mois</p>
              <p className="text-xs text-ink-500 max-w-sm mx-auto">
                Ajoutez vos prestations, contrats ou salaires pour suivre vos encaissements et votre chiffre d'affaires.
              </p>
              <Link
                href="/finances/income/new"
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    openQuickTransaction("income");
                  }
                }}
                className={buttonClasses("primary", "sm")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un revenu
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {/* En-tête de colonnes alignées sur tablette & desktop */}
              <div className="hidden md:grid grid-cols-12 gap-3 pb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <div className="col-span-5">Libellé &amp; Activité</div>
                <div className="col-span-3">Échéance &amp; Statut</div>
                <div className="col-span-2 text-right">Montant</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {(incomes ?? []).map((inc) => {
                const isLoading = actionLoadingId === inc.id;
                return (
                  <div key={inc.id} className="py-3.5 flex flex-col md:grid md:grid-cols-12 md:gap-3 md:items-center min-w-0">
                    {/* Colonne 1 : Libellé & Activité */}
                    <div className="min-w-0 md:col-span-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-950 dark:text-white truncate" title={inc.label}>
                          {inc.label}
                        </span>
                        <span
                          className={`md:hidden text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            inc.received ? "bg-positive-soft text-positive border border-positive/30" : "bg-warning-soft text-warning border border-warning/30"
                          }`}
                        >
                          {inc.received ? "Payé" : "En attente"}
                        </span>
                      </div>
                      <div className="text-xs text-ink-500 truncate mt-0.5">
                        {inc.activity?.name ? `Activité : ${inc.activity.name}` : "Revenu direct"}
                      </div>
                    </div>

                    {/* Colonne 2 : Échéance & Statut */}
                    <div className="min-w-0 md:col-span-3 text-xs text-ink-500 mt-1 md:mt-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border"
                          style={{
                            backgroundColor: inc.received ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                            color: inc.received ? "#059669" : "#D97706",
                            borderColor: inc.received ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)",
                          }}
                        >
                          {inc.received ? "Encaissé" : "En attente"}
                        </span>
                        <span className="truncate">
                          {inc.received && inc.received_at ? `Reçu le ${inc.received_at}` : `Échéance : ${inc.due_date}`}
                        </span>
                      </div>
                    </div>

                    {/* Colonne 3 : Montant */}
                    <div className="md:col-span-2 text-right mt-2 md:mt-0 flex items-center justify-between md:justify-end">
                      <span className="text-xs text-ink-400 md:hidden">Montant :</span>
                      <span className="font-mono font-bold text-sm text-ink-950 dark:text-white tabular-nums">
                        {formatAmount(inc.amount, inc.currency)}
                      </span>
                    </div>

                    {/* Colonne 4 : Actions */}
                    <div className="md:col-span-2 flex items-center justify-end gap-1.5 mt-2 md:mt-0 shrink-0">
                      {!inc.received ? (
                        <>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleToggleIncomeReceived(inc.id, false)}
                            className="px-2.5 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
                            title="Confirmer l'encaissement et ajouter au Solde Net"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>{isLoading ? "..." : "Encaisser"}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handlePostponeIncome(inc.id)}
                            className="px-2 py-1.5 rounded-lg border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 bg-canvas dark:bg-ink-950 text-xs font-medium hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
                            title="Reporter l'échéance de 7 jours"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600" />
                            )}
                            <span>+7j</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleIncomeReceived(inc.id, true)}
                          className="px-2 py-1 rounded-lg border border-ink-200 dark:border-ink-700 text-ink-500 hover:text-ink-800 dark:hover:text-ink-200 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="Remettre ce revenu en attente"
                        >
                          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Annuler</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: EXPENSES */}
      {activeTab === "expenses" && (
        <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md p-5 sm:p-7 space-y-5 min-w-0 animate-in fade-in-50 duration-150 shadow-sm">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-ink-950 dark:text-ink-50 flex items-center gap-2 truncate">
                <span className="p-1.5 rounded-xl bg-danger text-white shadow-xs">
                  <TrendingDown className="w-4 h-4" />
                </span>
                Dépenses du mois
              </h3>
              <p className="text-xs text-ink-500 mt-1">
                Historique des décaissements et charges à régler déduits du Solde Net.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/finances/expenses/new"
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    openQuickTransaction("expense");
                  }
                }}
                className={buttonClasses("primary", "sm")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Nouvelle dépense
              </Link>
              <button
                type="button"
                onClick={() => handleTabChange("scheduled")}
                className={buttonClasses("secondary", "sm")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Programmer une dépense
              </button>
            </div>
          </div>

          {(expenses ?? []).length === 0 ? (
            <div className="relative z-10 p-8 text-center rounded-2xl border border-dashed border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 space-y-3">
              <div className="w-10 h-10 rounded-full bg-danger-soft text-danger flex items-center justify-center mx-auto">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="font-semibold text-ink-950 dark:text-white text-sm">Aucune dépense pour ce mois</p>
              <p className="text-xs text-ink-500 max-w-sm mx-auto">
                Les dépenses payées sont automatiquement enregistrées lorsque vous marquez une dépense programmée comme payée ou en ajoutant une charge.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Link
                  href="/finances/expenses/new"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                      e.preventDefault();
                      openQuickTransaction("expense");
                    }
                  }}
                  className={buttonClasses("primary", "sm")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nouvelle dépense
                </Link>
                <button
                  type="button"
                  onClick={() => handleTabChange("scheduled")}
                  className={buttonClasses("secondary", "sm")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Programmer une dépense
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 divide-y divide-ink-100 dark:divide-ink-800">
              {/* En-tête de colonnes alignées sur tablette & desktop */}
              <div className="hidden md:grid grid-cols-12 gap-3 pb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <div className="col-span-5">Libellé &amp; Catégorie</div>
                <div className="col-span-3">Échéance &amp; Statut</div>
                <div className="col-span-2 text-right">Montant</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {(expenses ?? []).map((exp) => {
                const isLoading = actionLoadingId === exp.id;
                return (
                  <div key={exp.id} className="py-3 flex flex-col md:grid md:grid-cols-12 md:gap-3 md:items-center min-w-0">
                    {/* Colonne 1 : Libellé & Catégorie */}
                    <div className="min-w-0 md:col-span-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-950 dark:text-white truncate" title={exp.label}>
                          {exp.label}
                        </span>
                        <span
                          className={`md:hidden text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            exp.paid
                              ? "bg-positive-soft text-positive border border-positive/30"
                              : "bg-warning-soft text-warning border border-warning/30"
                          }`}
                        >
                          {exp.paid ? "Payée" : "À payer"}
                        </span>
                      </div>
                      <div className="text-xs text-ink-500 truncate mt-0.5">
                        {exp.category} {exp.activity?.name ? ` • Activité : ${exp.activity.name}` : ""}
                      </div>
                    </div>

                    {/* Colonne 2 : Échéance & Statut */}
                    <div className="min-w-0 md:col-span-3 text-xs text-ink-500 mt-1 md:mt-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border"
                          style={{
                            backgroundColor: exp.paid ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                            color: exp.paid ? "#059669" : "#D97706",
                            borderColor: exp.paid ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)",
                          }}
                        >
                          {exp.paid ? "Payée" : "À payer"}
                        </span>
                        <span className="truncate">
                          {exp.paid && exp.paid_at ? `Payé le ${exp.paid_at}` : `Échéance : ${exp.due_date}`}
                        </span>
                      </div>
                    </div>

                    {/* Colonne 3 : Montant */}
                    <div className="md:col-span-2 text-right mt-2 md:mt-0 flex items-center justify-between md:justify-end">
                      <span className="text-xs text-ink-400 md:hidden">Montant :</span>
                      <span className="font-mono font-bold text-sm text-ink-950 dark:text-white tabular-nums">
                        {formatAmount(exp.amount, exp.currency)}
                      </span>
                    </div>

                    {/* Colonne 4 : Actions */}
                    <div className="md:col-span-2 flex items-center justify-end gap-1.5 mt-2 md:mt-0 shrink-0">
                      {!exp.paid ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleExpensePaid(exp.id, false)}
                          className="px-2.5 py-1.5 rounded-lg bg-danger text-white text-xs font-semibold hover:bg-danger/90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
                          title="Marquer cette dépense comme réglée et déduire du Solde Net"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{isLoading ? "..." : "Régler"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleExpensePaid(exp.id, true)}
                          className="px-2 py-1 rounded-lg border border-ink-200 dark:border-ink-700 text-ink-500 hover:text-ink-800 dark:hover:text-ink-200 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="Remettre cette dépense en attente de règlement"
                        >
                          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Annuler</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
