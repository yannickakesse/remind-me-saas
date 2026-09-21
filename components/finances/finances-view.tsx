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
  Calendar,
  Check,
} from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { FinanceTabs, FinanceTab } from "./finance-tabs";
import { BudgetsSection } from "./budgets-section";
import { SavingsGoalsSection } from "./savings-goals-section";
import { ScheduledExpensesSection } from "./scheduled-expenses-section";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setIncomeReceived, postponeIncomeAction } from "@/app/(app)/finances/actions";

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
  expenseRows,
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
  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);
  const [incomes, setIncomes] = useState<any[]>(initialIncomeRows);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setIncomes(initialIncomeRows);
  }, [initialIncomeRows]);

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
  const totalExpensesPaid = initialAggregates.totalExpensesPaid;
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
    (expenseRows ?? []).length === 0 &&
    (scheduledExpenses ?? []).length === 0 &&
    (budgetsWithSpent ?? []).length === 0 &&
    (savingsGoals ?? []).length === 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 truncate flex items-center gap-2">
            <span className="bg-gradient-to-r from-gold to-gold-dark text-white p-1.5 rounded-xl shadow-gold-subtle inline-flex">
              <Wallet className="w-5 h-5" />
            </span>
            Gestion Financière
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Suivez vos encaissements, dépenses et échéances en un coup d'œil.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
            download
            className={buttonClasses("secondary", "sm")}
            title="Exporter les données financières au format CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Exporter
          </a>
          <Link
            href="/finances/income/new"
            className={buttonClasses("primary", "sm")}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Revenu
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
              label="Paiements en attente"
              value={formatAmount(totalIncomePending, defaultCurrency)}
              helper="Revenus attendus"
              tone="warning"
              icon={Clock}
            />
            <StatCard
              label="Total reçu"
              value={formatAmount(totalIncomeReceived, defaultCurrency)}
              helper="Argent encaissé"
              tone="positive"
              icon={TrendingUp}
            />
            <StatCard
              label="Dépenses payées"
              value={formatAmount(totalExpensesPaid, defaultCurrency)}
              helper="Payé ce mois"
              tone="danger"
              icon={TrendingDown}
            />
            <StatCard
              label="Solde net"
              value={formatAmount(netBalance, defaultCurrency)}
              helper="Total reçu − Dépenses payées"
              tone={netBalance >= 0 ? "positive" : "danger"}
              icon={Wallet}
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
                <Link href="/finances/income/new" className={buttonClasses("primary", "sm")}>
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
                  <Link href="/finances/income/new" className="inline-flex items-center text-xs font-semibold text-signal hover:underline">
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
        <div className="animate-in fade-in-50 duration-150">
          <ScheduledExpensesSection
            scheduledExpenses={scheduledExpenses}
            defaultCurrency={defaultCurrency}
            activities={activities}
          />
        </div>
      )}

      {/* Tab: BUDGETS */}
      {activeTab === "budgets" && (
        <div className="animate-in fade-in-50 duration-150">
          <BudgetsSection
            budgets={budgetsWithSpent}
            currencies={currenciesList}
            defaultCurrency={defaultCurrency}
          />
        </div>
      )}

      {/* Tab: SAVINGS */}
      {activeTab === "savings" && (
        <div className="animate-in fade-in-50 duration-150">
          <SavingsGoalsSection
            goals={savingsGoals}
            currencies={currenciesList}
            defaultCurrency={defaultCurrency}
          />
        </div>
      )}

      {/* Tab: INCOME */}
      {activeTab === "income" && (
        <div className="p-4 sm:p-6 rounded-xl border border-ink-200 bg-canvas-raised space-y-4 min-w-0 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-ink-950 truncate">Revenus du mois</h3>
              <p className="text-xs text-ink-500">
                Encaissez vos paiements reçus pour les intégrer à votre Total reçu et Solde net.
              </p>
            </div>
            <Link href="/finances/income/new" className={buttonClasses("primary", "sm")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau revenu
            </Link>
          </div>

          {(incomes ?? []).length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-ink-300 bg-canvas space-y-3">
              <div className="w-10 h-10 rounded-full bg-positive-soft text-positive flex items-center justify-center mx-auto">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="font-semibold text-ink-950 text-sm">Aucun revenu pour ce mois</p>
              <p className="text-xs text-ink-500 max-w-sm mx-auto">
                Ajoutez vos prestations, contrats ou salaires pour suivre vos encaissements et votre chiffre d'affaires.
              </p>
              <Link href="/finances/income/new" className={buttonClasses("primary", "sm")}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un revenu
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {(incomes ?? []).map((inc) => {
                const isLoading = actionLoadingId === inc.id;
                return (
                  <div key={inc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-950 truncate" title={inc.label}>
                          {inc.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            inc.received ? "bg-positive-soft text-positive border border-positive/30" : "bg-warning-soft text-warning border border-warning/30"
                          }`}
                        >
                          {inc.received ? "Payé / Encaissé" : "En attente"}
                        </span>
                      </div>
                      <div className="text-xs text-ink-500 truncate mt-0.5">
                        Échéance : {inc.due_date} {inc.received && inc.received_at ? `• Encaissé le ${inc.received_at}` : ""}
                        {inc.activity?.name ? ` • Activité : ${inc.activity.name}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-sm text-ink-950">
                          {formatAmount(inc.amount, inc.currency)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!inc.received ? (
                          <>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleToggleIncomeReceived(inc.id, false)}
                              className="px-2.5 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1"
                              title="Confirmer l'encaissement et ajouter au Solde Net"
                            >
                              <Check className="w-3.5 h-3.5" /> Encaisser
                            </button>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handlePostponeIncome(inc.id)}
                              className="px-2 py-1.5 rounded-lg border border-ink-200 text-ink-700 bg-canvas text-xs font-medium hover:bg-ink-100 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1"
                              title="Reporter l'échéance de 7 jours"
                            >
                              <Clock className="w-3 h-3 text-amber-600" /> Reporter (+7j)
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleToggleIncomeReceived(inc.id, true)}
                            className="px-2 py-1 rounded-lg border border-ink-200 text-ink-500 hover:text-ink-800 text-[11px] font-medium transition-colors"
                            title="Remettre ce revenu en attente"
                          >
                            Annuler l'encaissement
                          </button>
                        )}
                      </div>
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
        <div className="p-4 sm:p-6 rounded-xl border border-ink-200 bg-canvas-raised space-y-4 min-w-0 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-ink-950 truncate">Dépenses payées du mois</h3>
              <p className="text-xs text-ink-500">
                Historique des décaissements réels déduits du Solde Net.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange("scheduled")}
              className={buttonClasses("secondary", "sm")}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Programmer une dépense
            </button>
          </div>

          {(expenseRows ?? []).length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-ink-300 bg-canvas space-y-3">
              <div className="w-10 h-10 rounded-full bg-danger-soft text-danger flex items-center justify-center mx-auto">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="font-semibold text-ink-950 text-sm">Aucune dépense payée pour ce mois</p>
              <p className="text-xs text-ink-500 max-w-sm mx-auto">
                Les dépenses payées sont automatiquement enregistrées lorsque vous marquez une dépense programmée comme payée.
              </p>
              <button
                type="button"
                onClick={() => handleTabChange("scheduled")}
                className={buttonClasses("secondary", "sm")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Programmer une dépense
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {(expenseRows ?? []).map((exp) => (
                <div key={exp.id} className="py-3 flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-ink-950 truncate" title={exp.label}>
                      {exp.label}
                    </div>
                    <div className="text-xs text-ink-500 truncate">
                      {exp.category} • {exp.paid ? "Payé le " + exp.paid_at : "Échéance : " + exp.due_date}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-ink-950">
                      {formatAmount(exp.amount, exp.currency)}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-positive-soft text-positive inline-block mt-0.5 border border-positive/30">
                      {exp.paid ? "Payée" : "À payer"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
