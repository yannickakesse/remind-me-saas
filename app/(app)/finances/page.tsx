import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { getFinancesForRange, sumByCurrencyAndStatus } from "@/lib/finances/aggregate";
import {
  financeStatusLabel,
  FINANCE_STATUS_STYLES,
  expenseCategoryLabel,
} from "@/lib/validation/finances";
import { setIncomeReceived, deleteIncome, setExpensePaid, deleteExpense } from "./actions";
import { formatAmount } from "@/lib/finances/format";
import { FinanceTabs } from "@/components/finances/finance-tabs";
import { BudgetsSection } from "@/components/finances/budgets-section";
import { SavingsGoalsSection } from "@/components/finances/savings-goals-section";
import { buttonClasses } from "@/components/ui/button";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const currentTab = searchParams?.tab || "overview";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, default_currency")
    .eq("id", user!.id)
    .single();
  const timezone = profile?.timezone ?? "UTC";
  const mainCurrency = profile?.default_currency ?? "XOF";

  const { data: currencies } = await supabase
    .from("currencies")
    .select("code, symbol")
    .order("code");

  const now = DateTime.now().setZone(timezone);
  const startOfMonth = now.startOf("month").toISODate()!;
  const endOfMonth = now.endOf("month").toISODate()!;

  // Synchronisation des revenus récurrents
  await ensureIncomeEntries(supabase, user!.id, startOfMonth, endOfMonth, timezone);

  // Données financières du mois
  const { income, expenses } = await getFinancesForRange(
    supabase,
    user!.id,
    startOfMonth,
    endOfMonth,
    timezone
  );

  // Totaux agrégés
  const incomeTotals = sumByCurrencyAndStatus(income);
  const expenseTotals = sumByCurrencyAndStatus(expenses);

  // Récupération des budgets avec dépenses calculées
  const { data: budgetsData } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  const budgetsWithSpent = (budgetsData ?? []).map((b) => {
    const spentForCat = expenses
      .filter((e) => e.category === b.category && e.currency === b.currency)
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    return {
      ...b,
      spent: spentForCat,
    };
  });

  // Récupération des objectifs d'épargne
  const { data: savingsGoals } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  // Totaux pour la vue d'ensemble
  const totalIncomeReceived = income
    .filter((i) => i.status === "received" && i.currency === mainCurrency)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalIncomeExpected = income
    .filter((i) => i.currency === mainCurrency)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalExpensesPaid = expenses
    .filter((e) => e.status === "paid" && e.currency === mainCurrency)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalExpensesExpected = expenses
    .filter((e) => e.currency === mainCurrency)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const netBalance = totalIncomeReceived - totalExpensesPaid;

  return (
    <div className="space-y-6">
      {/* En-tête principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Finances & Trésorerie</h1>
          <p className="text-sm text-ink-500">
            Période : <strong className="text-ink-900">{now.toFormat("MMMM yyyy")}</strong> • Devise principale : {mainCurrency}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/api/finances/export" className={buttonClasses("secondary", "sm")}>
            Exporter CSV
          </Link>
          <Link href="/finances/income/new" className={buttonClasses("primary", "sm")}>
            + Ajouter un revenu
          </Link>
          <Link href="/finances/expenses/new" className={buttonClasses("secondary", "sm")}>
            + Ajouter une dépense
          </Link>
        </div>
      </div>

      {/* Barre d'onglets */}
      <FinanceTabs />

      {/* 1. VUE D'ENSEMBLE */}
      {currentTab === "overview" && (
        <div className="space-y-8">
          {/* Cartes KPI Synthèse */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Solde Net Réel
              </span>
              <p
                className={`mt-2 text-2xl font-extrabold ${
                  netBalance >= 0 ? "text-positive" : "text-danger"
                }`}
              >
                {formatAmount(netBalance, mainCurrency)}
              </p>
              <p className="mt-1 text-xs text-ink-500">Revenus reçus - Dépenses payées</p>
            </div>

            <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Revenus du Mois
              </span>
              <p className="mt-2 text-2xl font-extrabold text-signal">
                {formatAmount(totalIncomeExpected, mainCurrency)}
              </p>
              <p className="mt-1 text-xs text-positive font-medium">
                {formatAmount(totalIncomeReceived, mainCurrency)} déjà encaissés
              </p>
            </div>

            <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Dépenses du Mois
              </span>
              <p className="mt-2 text-2xl font-extrabold text-ink-950">
                {formatAmount(totalExpensesExpected, mainCurrency)}
              </p>
              <p className="mt-1 text-xs text-ink-500 font-medium">
                {formatAmount(totalExpensesPaid, mainCurrency)} déjà réglées
              </p>
            </div>

            <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Objectifs d'Épargne
              </span>
              <p className="mt-2 text-2xl font-extrabold text-ink-950">
                {savingsGoals?.length ?? 0}
              </p>
              <p className="mt-1 text-xs text-signal font-medium">
                Poches actives suivies
              </p>
            </div>
          </div>

          {/* Aperçu rapide Budgets & Épargne */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-ink-200 bg-canvas-raised p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink-950 text-base">Budgets Mensuels</h3>
                <Link href="/finances?tab=budgets" className="text-xs font-semibold text-signal hover:underline">
                  Voir tout ({budgetsWithSpent.length}) →
                </Link>
              </div>
              {budgetsWithSpent.length === 0 ? (
                <p className="text-sm text-ink-500 py-4 text-center">Aucun budget défini.</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {budgetsWithSpent.slice(0, 3).map((b) => (
                    <div key={b.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-ink-900">{expenseCategoryLabel(b.category)}</span>
                        <span className="text-ink-600">
                          {formatAmount(b.spent, b.currency)} / {formatAmount(b.monthly_limit, b.currency)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                        <div
                          className="h-full bg-signal rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round((b.spent / b.monthly_limit) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-ink-200 bg-canvas-raised p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink-950 text-base">Épargne & Projets</h3>
                <Link href="/finances?tab=savings" className="text-xs font-semibold text-signal hover:underline">
                  Voir tout ({savingsGoals?.length ?? 0}) →
                </Link>
              </div>
              {savingsGoals?.length === 0 ? (
                <p className="text-sm text-ink-500 py-4 text-center">Aucun objectif d'épargne défini.</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {savingsGoals?.slice(0, 3).map((g) => {
                    const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
                    return (
                      <div key={g.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-ink-900">{g.name}</span>
                          <span className="text-signal font-semibold">{pct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                          <div className="h-full bg-signal rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ONGLET REVENUS */}
      {currentTab === "income" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-ink-950">Revenus du Mois</h2>
            <Link href="/finances/income/new" className={buttonClasses("primary", "sm")}>
              + Nouveau revenu
            </Link>
          </div>

          {income.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-300 p-8 text-center bg-canvas-raised">
              <p className="font-semibold text-ink-950">Aucun revenu pour ce mois</p>
              <p className="text-sm text-ink-500 mt-1">Ajoutez un revenu ponctuel ou configurez la rémunération d'une activité.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-ink-200 bg-canvas-raised overflow-hidden">
              <ul className="divide-y divide-ink-100">
                {income.map((item) => {
                  const style = FINANCE_STATUS_STYLES[item.status];
                  return (
                    <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-canvas/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-950">{item.label}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}>
                            {financeStatusLabel(item.status, "income")}
                          </span>
                        </div>
                        <p className="text-xs text-ink-500">
                          {item.activity ? `Activité : ${item.activity.name} • ` : ""}
                          {item.due_date ? `Échéance : ${item.due_date}` : "Sans date"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-base font-extrabold text-ink-950">
                          +{formatAmount(item.amount, item.currency)}
                        </span>
                        <form action={setIncomeReceived.bind(null, item.id, item.status !== "received")}>
                          <button type="submit" className="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-100">
                            {item.status === "received" ? "Marquer non reçu" : "Marquer reçu"}
                          </button>
                        </form>
                        <form action={deleteIncome.bind(null, item.id)}>
                          <button type="submit" className="text-xs text-ink-400 hover:text-danger">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 3. ONGLET DÉPENSES */}
      {currentTab === "expenses" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-ink-950">Dépenses du Mois</h2>
            <Link href="/finances/expenses/new" className={buttonClasses("primary", "sm")}>
              + Nouvelle dépense
            </Link>
          </div>

          {expenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-300 p-8 text-center bg-canvas-raised">
              <p className="font-semibold text-ink-950">Aucune dépense pour ce mois</p>
              <p className="text-sm text-ink-500 mt-1">Ajoutez vos dépenses professionnelles ou personnelles.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-ink-200 bg-canvas-raised overflow-hidden">
              <ul className="divide-y divide-ink-100">
                {expenses.map((item) => {
                  const style = FINANCE_STATUS_STYLES[item.status];
                  return (
                    <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-canvas/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-950">{item.label}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}>
                            {financeStatusLabel(item.status, "expense")}
                          </span>
                          <span className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
                            {expenseCategoryLabel(item.category)}
                          </span>
                        </div>
                        <p className="text-xs text-ink-500">
                          {item.activity ? `Activité : ${item.activity.name} • ` : ""}
                          {item.due_date ? `Échéance : ${item.due_date}` : "Sans date"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-base font-extrabold text-danger">
                          -{formatAmount(item.amount, item.currency)}
                        </span>
                        <form action={setExpensePaid.bind(null, item.id, item.status !== "paid")}>
                          <button type="submit" className="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-100">
                            {item.status === "paid" ? "Marquer non payée" : "Marquer payée"}
                          </button>
                        </form>
                        <form action={deleteExpense.bind(null, item.id)}>
                          <button type="submit" className="text-xs text-ink-400 hover:text-danger">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4. ONGLET BUDGETS */}
      {currentTab === "budgets" && (
        <BudgetsSection
          budgets={budgetsWithSpent}
          currencies={currencies ?? []}
          defaultCurrency={mainCurrency}
        />
      )}

      {/* 5. ONGLET ÉPARGNE */}
      {currentTab === "savings" && (
        <SavingsGoalsSection
          goals={savingsGoals ?? []}
          currencies={currencies ?? []}
          defaultCurrency={mainCurrency}
        />
      )}
    </div>
  );
}
