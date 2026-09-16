"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Plus,
  ArrowRight,
  Download,
} from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { FinanceTabs, FinanceTab } from "./finance-tabs";
import { BudgetsSection } from "./budgets-section";
import { SavingsGoalsSection } from "./savings-goals-section";
import { ScheduledExpensesSection } from "./scheduled-expenses-section";
import { buttonClasses } from "@/components/ui/button";

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
  aggregates,
  incomeRows,
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
  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);

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
          <Link
            href="/finances/expenses/new"
            className={buttonClasses("secondary", "sm")}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Dépense
          </Link>
        </div>
      </div>

      {/* Tabs avec basculement instantané à 0ms */}
      <FinanceTabs currentTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-5 w-full min-w-0 animate-in fade-in-50 duration-150">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0">
            <StatCard
              label="Total Reçu"
              value={formatAmount(aggregates.totalIncomeReceived, defaultCurrency)}
              helper="Encaissé ce mois"
              tone="positive"
              icon={TrendingUp}
            />
            <StatCard
              label="En Attente"
              value={formatAmount(aggregates.totalIncomePending, defaultCurrency)}
              helper="Revenus attendus"
              tone="warning"
              icon={Clock}
            />
            <StatCard
              label="Dépensé"
              value={formatAmount(aggregates.totalExpensesPaid, defaultCurrency)}
              helper="Payé ce mois"
              tone="danger"
              icon={TrendingDown}
            />
            <StatCard
              label="Solde Net"
              value={formatAmount(aggregates.netBalance, defaultCurrency)}
              helper="Reçu - Dépensé"
              tone={aggregates.netBalance >= 0 ? "positive" : "danger"}
              icon={Wallet}
            />
          </div>

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

              {(incomeRows ?? []).filter((i) => !i.received).slice(0, 4).length === 0 ? (
                <div className="text-xs text-ink-400 py-4 text-center">Aucun revenu en attente</div>
              ) : (
                <div className="space-y-2">
                  {(incomeRows ?? []).filter((i) => !i.received).slice(0, 4).map((inc) => (
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
                <div className="text-xs text-ink-400 py-4 text-center">Aucune dépense programmée</div>
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
        <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-4 min-w-0 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-ink-950 truncate">Revenus du mois</h3>
            <Link href="/finances/income/new" className={buttonClasses("primary", "sm")}>
              + Nouveau revenu
            </Link>
          </div>

          {(incomeRows ?? []).length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-400">Aucun revenu pour ce mois</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {(incomeRows ?? []).map((inc) => (
                <div key={inc.id} className="py-3 flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-ink-950 truncate" title={inc.label}>
                      {inc.label}
                    </div>
                    <div className="text-xs text-ink-500 truncate">
                      Échéance: {inc.due_date} • {inc.received ? "Payé le " + inc.received_at : "En attente"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-ink-950">
                      {formatAmount(inc.amount, inc.currency)}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        inc.received ? "bg-positive-soft text-positive" : "bg-warning-soft text-warning"
                      }`}
                    >
                      {inc.received ? "Reçu" : "En attente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: EXPENSES */}
      {activeTab === "expenses" && (
        <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-4 min-w-0 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-ink-950 truncate">Dépenses payées du mois</h3>
            <Link href="/finances/expenses/new" className={buttonClasses("secondary", "sm")}>
              + Nouvelle dépense
            </Link>
          </div>

          {(expenseRows ?? []).length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-400">Aucune dépense pour ce mois</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {(expenseRows ?? []).map((exp) => (
                <div key={exp.id} className="py-3 flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-ink-950 truncate" title={exp.label}>
                      {exp.label}
                    </div>
                    <div className="text-xs text-ink-500 truncate">
                      {exp.category} • {exp.paid ? "Payé le " + exp.paid_at : "Échéance: " + exp.due_date}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-ink-950">
                      {formatAmount(exp.amount, exp.currency)}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-positive-soft text-positive inline-block mt-0.5">
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
