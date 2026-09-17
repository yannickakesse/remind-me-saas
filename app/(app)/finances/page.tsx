import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { aggregateFinancesForMonth } from "@/lib/finances/aggregate";
import { FinancesView } from "@/components/finances/finances-view";
import type { FinanceTab } from "@/components/finances/finance-tabs";

export const dynamic = "force-dynamic";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams?: { tab?: string; month?: string };
}) {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

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

  const supabase = createClient();

  // 1. Synchronisation rapide des revenus
  await ensureIncomeEntries(supabase, user.id, rangeStart, rangeEnd);

  // 2. Requêtes parallélisées optimisées
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
      .eq("user_id", user.id)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .order("due_date", { ascending: true }),
    supabase
      .from("expenses")
      .select("*, activity:activities(id, name, color)")
      .eq("user_id", user.id)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .order("due_date", { ascending: true }),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("category", { ascending: true }),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("scheduled_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("next_due_date", { ascending: true }),
    supabase
      .from("activities")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

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

  const initialTab: FinanceTab = (searchParams?.tab as FinanceTab) || "overview";

  return (
    <FinancesView
      initialTab={initialTab}
      aggregates={aggregates}
      incomeRows={incomeRows ?? []}
      expenseRows={expenseRows ?? []}
      budgetsWithSpent={budgetsWithSpent}
      savingsGoals={savingsGoals ?? []}
      scheduledExpenses={scheduledExpenses ?? []}
      activities={activities ?? []}
      currenciesList={currenciesList}
      defaultCurrency={defaultCurrency}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
    />
  );
}
