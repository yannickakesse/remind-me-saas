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
      .select("id, activity_id, amount, currency, due_date, received")
      .eq("user_id", userId)
      .gte("due_date", startDate)
      .lte("due_date", endDate),
    supabase
      .from("expenses")
      .select("id, activity_id, category, amount, currency, due_date, paid")
      .eq("user_id", userId)
      .gte("due_date", startDate)
      .lte("due_date", endDate),
    supabase
      .from("calendar_events")
      .select("id, activity_id, starts_at, ends_at, status")
      .eq("user_id", userId)
      .gte("starts_at", startDate + "T00:00:00Z")
      .lte("ends_at", endDate + "T23:59:59Z")
      .neq("status", "cancelled"),
  ]);

  const activityMap = new Map<string, { name: string; color: string | null }>();
  (activities ?? []).forEach((a) => activityMap.set(a.id, { name: a.name, color: a.color }));

  // 2. Calcul des heures travaillées par activité depuis calendar_events
  const hoursByActivity = new Map<string, number>();
  let totalHoursWorked = 0;

  (calendarEvents ?? []).forEach((e) => {
    if (!e.starts_at || !e.ends_at) return;
    const start = DateTime.fromISO(e.starts_at, { zone: timezone });
    const end = DateTime.fromISO(e.ends_at, { zone: timezone });
    const durationHours = Math.max(0, end.diff(start, "hours").hours);

    const actId = e.activity_id ?? "unassigned";
    const currentHours = hoursByActivity.get(actId) ?? 0;
    hoursByActivity.set(actId, currentHours + durationHours);
    totalHoursWorked += durationHours;
  });

  // 3. Agrégation financière par activité et devise
  const actStats = new Map<string, { income: number; expenses: number }>();

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
    cur.expenses += Number(e.amount);
    actStats.set(key, cur);
  });

  // 4. Construction de la liste de rentabilité
  const profitabilityList: ActivityProfitability[] = [];

  actStats.forEach((val, key) => {
    const parts = key.split("::");
    const actId = parts[0] || "unassigned";
    const currency = parts[1] || "EUR";
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
  const topItem = profitabilityList[0];
  if (topItem && topItem.hourlyRate && topItem.hourlyRate > 0) {
    topItem.isTopPerformer = true;
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
    const parts = key.split("::");
    const cat = parts[0] || "other";
    const percentage = totalExpensesOverall > 0 ? Math.round((val.amount / totalExpensesOverall) * 100) : 0;
    categoryBreakdown.push({
      category: cat,
      amount: val.amount,
      currency: val.currency,
      percentage,
    });
  });
  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  // 6. Évolution mensuelle (sur les 6 derniers mois)
  const monthlySummaries: MonthlySummaryItem[] = [];
  const endDT = DateTime.fromISO(endDate, { zone: timezone });

  for (let m = 5; m >= 0; m--) {
    const mDT = endDT.minus({ months: m });
    const monthKey = mDT.toFormat("yyyy-MM");
    const monthLabel = mDT.setLocale("fr").toFormat("MMM yyyy");

    let monthInc = 0;
    let monthExp = 0;
    let monthCurr = "EUR";

    (incomeEntries ?? []).forEach((i) => {
      if (i.due_date && i.due_date.startsWith(monthKey)) {
        monthInc += Number(i.amount);
        monthCurr = i.currency;
      }
    });

    (expenseEntries ?? []).forEach((e) => {
      if (e.due_date && e.due_date.startsWith(monthKey)) {
        monthExp += Number(e.amount);
        monthCurr = e.currency;
      }
    });

    monthlySummaries.push({
      monthKey,
      monthLabel,
      income: monthInc,
      expenses: monthExp,
      net: monthInc - monthExp,
      currency: monthCurr,
    });
  }

  return {
    profitabilityList,
    categoryBreakdown,
    monthlySummaries,
    monthlyEvolution: monthlySummaries,
    totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
  };
}
