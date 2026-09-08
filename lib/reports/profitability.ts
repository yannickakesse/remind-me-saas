import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

export interface ActivityProfitability {
  activityId: string | null;
  activityName: string;
  activityColor: string | null;
  currency: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalHours: number;
  hourlyRate: number | null; // Net Profit / totalHours
  isTopPerformer?: boolean;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  currency: string;
  percentage: number;
}

export interface MonthlySummaryItem {
  monthKey: string; // "2026-03"
  monthLabel: string; // "Mars 2026"
  income: number;
  expenses: number;
  net: number;
  currency: string;
}

export async function calculateProfitabilityReport(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
  timezone: string = "UTC"
) {
  // 1. Récupérer activités, revenus, dépenses et événements calendrier
  const [
    { data: activities },
    { data: incomeEntries },
    { data: expenseEntries },
    { data: calendarEvents },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", userId),
    supabase
      .from("income")
      .select("id, activity_id, amount, currency, due_date, received_at")
      .eq("user_id", userId)
      .gte("due_date", startDate)
      .lte("due_date", endDate),
    supabase
      .from("expenses")
      .select("id, activity_id, category, amount, currency, due_date, paid_at, expense_type, business_percentage")
      .eq("user_id", userId)
      .gte("due_date", startDate)
      .lte("due_date", endDate),
    supabase
      .from("calendar_events")
      .select("id, activity_id, start_at, end_at, status")
      .eq("user_id", userId)
      .gte("start_at", startDate + "T00:00:00Z")
      .lte("end_at", endDate + "T23:59:59Z")
      .neq("status", "cancelled"),
  ]);

  const activityMap = new Map<string, { name: string; color: string | null }>();
  (activities ?? []).forEach((a) => activityMap.set(a.id, { name: a.name, color: a.color }));

  // 2. Calcul des heures travaillées par activité depuis calendar_events
  const hoursByActivity = new Map<string, number>();
  let totalHoursWorked = 0;

  (calendarEvents ?? []).forEach((e) => {
    if (!e.start_at || !e.end_at) return;
    const start = DateTime.fromISO(e.start_at);
    const end = DateTime.fromISO(e.end_at);
    const durationHours = Math.max(0, end.diff(start, "hours").hours);

    const actId = e.activity_id ?? "unassigned";
    const currentHours = hoursByActivity.get(actId) ?? 0;
    hoursByActivity.set(actId, currentHours + durationHours);
    totalHoursWorked += durationHours;
  });

  // 3. Agrégation financière par activité et devise
  type ActKey = string; // "actId::currency"
  const actStats = new Map<ActKey, { income: number; expenses: number }>();

  (incomeEntries ?? []).forEach((i) => {
    const actId = i.activity_id ?? "unassigned";
    const curr = i.currency;
    const key = `${actId}::${curr}`;
    const cur = actStats.get(key) ?? { income: 0, expenses: 0 };
    cur.income += Number(i.amount);
    actStats.set(key, cur);
  });

  (expenseEntries ?? []).forEach((e) => {
    const actId = e.activity_id ?? "unassigned";
    const curr = e.currency;
    const key = `${actId}::${curr}`;
    const cur = actStats.get(key) ?? { income: 0, expenses: 0 };
    
    // Prise en compte du ratio pro si mixte
    let effectiveExpense = Number(e.amount);
    if (e.expense_type === "mixed" && e.business_percentage !== undefined) {
      effectiveExpense = (effectiveExpense * e.business_percentage) / 100;
    }
    cur.expenses += effectiveExpense;
    actStats.set(key, cur);
  });

  // 4. Construction de la liste de rentabilité
  const profitabilityList: ActivityProfitability[] = [];

  actStats.forEach((val, key) => {
    const [actId, currency] = key.split("::");
    const actInfo = activityMap.get(actId);
    const hours = hoursByActivity.get(actId) ?? 0;
    const netProfit = val.income - val.expenses;
    const hourlyRate = hours > 0 ? Math.round(netProfit / hours) : null;

    profitabilityList.push({
      activityId: actId === "unassigned" ? null : actId,
      activityName: actInfo ? actInfo.name : "Général / Libre",
      activityColor: actInfo ? actInfo.color : null,
      currency,
      totalIncome: val.income,
      totalExpenses: val.expenses,
      netProfit,
      totalHours: Math.round(hours * 10) / 10,
      hourlyRate,
    });
  });

  // Trier par bénéfice net décroissant
  profitabilityList.sort((a, b) => b.netProfit - a.netProfit);
  if (profitabilityList.length > 0 && profitabilityList[0].hourlyRate && profitabilityList[0].hourlyRate > 0) {
    profitabilityList[0].isTopPerformer = true;
  }

  // 5. Ventilation des dépenses par catégorie
  const catTotals = new Map<string, { amount: number; currency: string }>();
  let totalExpensesOverall = 0;

  (expenseEntries ?? []).forEach((e) => {
    const cat = e.category || "other";
    const curr = e.currency;
    const key = `${cat}::${curr}`;
    const cur = catTotals.get(key) ?? { amount: 0, currency: curr };
    cur.amount += Number(e.amount);
    catTotals.set(key, cur);
    totalExpensesOverall += Number(e.amount);
  });

  const categoryBreakdown: CategoryBreakdownItem[] = [];
  catTotals.forEach((val, key) => {
    const [cat] = key.split("::");
    const pct = totalExpensesOverall > 0 ? Math.round((val.amount / totalExpensesOverall) * 100) : 0;
    categoryBreakdown.push({
      category: cat,
      amount: val.amount,
      currency: val.currency,
      percentage: pct,
    });
  });
  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  // 6. Évolution mensuelle
  const monthlyMap = new Map<string, { income: number; expenses: number; currency: string }>();

  (incomeEntries ?? []).forEach((i) => {
    if (!i.due_date) return;
    const mKey = i.due_date.slice(0, 7);
    const key = `${mKey}::${i.currency}`;
    const cur = monthlyMap.get(key) ?? { income: 0, expenses: 0, currency: i.currency };
    cur.income += Number(i.amount);
    monthlyMap.set(key, cur);
  });

  (expenseEntries ?? []).forEach((e) => {
    if (!e.due_date) return;
    const mKey = e.due_date.slice(0, 7);
    const key = `${mKey}::${e.currency}`;
    const cur = monthlyMap.get(key) ?? { income: 0, expenses: 0, currency: e.currency };
    cur.expenses += Number(e.amount);
    monthlyMap.set(key, cur);
  });

  const monthlyEvolution: MonthlySummaryItem[] = [];
  monthlyMap.forEach((val, key) => {
    const [mKey, currency] = key.split("::");
    const d = DateTime.fromISO(mKey + "-01").setLocale("fr");
    const label = d.toFormat("MMMM yyyy");
    monthlyEvolution.push({
      monthKey: mKey,
      monthLabel: label.charAt(0).toUpperCase() + label.slice(1),
      income: val.income,
      expenses: val.expenses,
      net: val.income - val.expenses,
      currency,
    });
  });
  monthlyEvolution.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  return {
    profitabilityList,
    categoryBreakdown,
    monthlyEvolution,
    totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
  };
}
