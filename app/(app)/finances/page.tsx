import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { aggregateFinancesForMonth } from "@/lib/finances/aggregate";
import { formatAmount } from "@/lib/finances/format";
import { deriveFinanceStatus } from "@/lib/validation/finances";
import { StatCard } from "@/components/dashboard/stat-card";
import { FinanceTabs, FinanceTab } from "@/components/finances/finance-tabs";
import { BudgetsSection } from "@/components/finances/budgets-section";
import { SavingsGoalsSection } from "@/components/finances/savings-goals-section";
import { ScheduledExpensesSection } from "@/components/finances/scheduled-expenses-section";
import { buttonClasses } from "@/components/ui/button";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams?: { tab?: string; month?: string };
}) {
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
  const defaultCurrency = profile?.default_currency ?? "XOF";
  const today = DateTime.now().setZone(timezone);

  const monthParam = searchParams?.month;
  const currentMonth =
    monthParam && DateTime.fromFormat(monthParam, "yyyy-MM").isValid
      ? DateTime.fromFormat(monthParam, "yyyy-MM", { zone: timezone })
      : today.startOf("month");

  const rangeStart = currentMonth.startOf("month").toISODate()!;
  const rangeEnd = currentMonth.endOf("month").toISODate()!;

  // 1. Synchronisation paresseuse des revenus pour ce mois
  await ensureIncomeEntries(supabase, user!.id, rangeStart, rangeEnd);

  // 2. Requêtes parallélisées pour optimiser le temps de réponse
  const [
    { data: incomeRows },
    { data: expenseRows },
    { data: budgets },
    { data: savingsGoals },
    { data: scheduledExpenses },
    { data: activities },
  ] = await Promise.all([
    supabase
      .from("income")
      .select("*, activity:activities(id, name, color)")
      .eq("user_id", user!.id)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .order("due_date", { ascending: true }),
    supabase
      .from("expenses")
      .select("*, activity:activities(id, name, color)")
      .eq("user_id", user!.id)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .order("due_date", { ascending: true }),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user!.id)
      .order("category", { ascending: true }),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("scheduled_expenses")
      .select("*")
      .eq("user_id", user!.id)
      .order("next_due_date", { ascending: true }),
    supabase
      .from("activities")
      .select("id, name")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  // Agrégats du mois
  
  // Calcul du dépensé par catégorie pour les budgets
  const budgetsWithSpent = (budgets ?? []).map((b) => {
    const spent = (expenseRows ?? [])
      .filter((e) => e.category === b.category)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { ...b, spent };
  });
  const currenciesList = [
    { code: "XOF", symbol: "FCFA" },
    { code: "EUR", symbol: "€" },
    { code: "USD", symbol: "$" },
    { code: "GBP", symbol: "£" },
    { code: "CAD", symbol: "$" },
    { code: "CHF", symbol: "CHF" },
  ];

  const aggregates = aggregateFinancesForMonth(
    incomeRows ?? [],
    expenseRows ?? [],
    today.toISODate()!
  );

  const activeTab: FinanceTab = (searchParams?.tab as FinanceTab) || "overview";

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 truncate">
            Gestion Financière
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Suivez vos encaissements, dépenses et échéances en un coup d'œil.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/finances/income/new"
            className={buttonClasses("primary", "sm")}
          >
            + Revenu
          </Link>
          <Link
            href="/finances/expenses/new"
            className={buttonClasses("secondary", "sm")}
          >
            + Dépense
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <FinanceTabs currentTab={activeTab} />

      {/* Tab: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-5 w-full min-w-0">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0">
            <StatCard
              label="Total Reçu"
              value={formatAmount(aggregates.totalIncomeReceived, defaultCurrency)}
              helper="Encaissé ce mois"
              tone="positive"
            />
            <StatCard
              label="En Attente"
              value={formatAmount(aggregates.totalIncomePending, defaultCurrency)}
              helper="Revenus attendus"
              tone="warning"
            />
            <StatCard
              label="Dépensé"
              value={formatAmount(aggregates.totalExpensesPaid, defaultCurrency)}
              helper="Payé ce mois"
              tone="danger"
            />
            <StatCard
              label="Solde Net"
              value={formatAmount(aggregates.netBalance, defaultCurrency)}
              helper="Reçu - Dépensé"
              tone={aggregates.netBalance >= 0 ? "positive" : "danger"}
            />
          </div>

          {/* Quick Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
            {/* Prochains encaissements */}
            <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-ink-950 flex items-center gap-1.5 truncate">
                  <span>📈</span> Prochains Revenus
                </h3>
                <Link href="/finances?tab=income" className="text-xs font-semibold text-signal hover:underline shrink-0">
                  Voir tout
                </Link>
              </div>

              {(incomeRows ?? []).filter(i => !i.received).slice(0, 4).length === 0 ? (
                <div className="text-xs text-ink-400 py-4 text-center">Aucun revenu en attente</div>
              ) : (
                <div className="space-y-2">
                  {(incomeRows ?? []).filter(i => !i.received).slice(0, 4).map(inc => (
                    <div key={inc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-canvas text-xs gap-2 min-w-0">
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
                  <span>⏰</span> Dépenses Programmées
                </h3>
                <Link href="/finances?tab=scheduled" className="text-xs font-semibold text-signal hover:underline shrink-0">
                  Voir tout
                </Link>
              </div>

              {(scheduledExpenses ?? []).filter(s => s.status === "planned" || s.status === "due").slice(0, 4).length === 0 ? (
                <div className="text-xs text-ink-400 py-4 text-center">Aucune dépense programmée</div>
              ) : (
                <div className="space-y-2">
                  {(scheduledExpenses ?? []).filter(s => s.status === "planned" || s.status === "due").slice(0, 4).map(sc => (
                    <div key={sc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-canvas text-xs gap-2 min-w-0">
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
        <ScheduledExpensesSection
          scheduledExpenses={(scheduledExpenses ?? []) as any}
          defaultCurrency={defaultCurrency}
          activities={activities ?? []}
        />
      )}

      {/* Tab: BUDGETS */}
      {activeTab === "budgets" && (
        <BudgetsSection
          budgets={budgetsWithSpent as any}
          currencies={currenciesList}
          defaultCurrency={defaultCurrency}
        />
      )}

      {/* Tab: SAVINGS */}
      {activeTab === "savings" && (
        <SavingsGoalsSection
          goals={(savingsGoals ?? []) as any}
          currencies={currenciesList}
          defaultCurrency={defaultCurrency}
        />
      )}

      {/* Tab: INCOME */}
      {activeTab === "income" && (
        <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-4 min-w-0">
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      inc.received ? "bg-positive-soft text-positive" : "bg-warning-soft text-warning"
                    }`}>
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
        <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-4 min-w-0">
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
