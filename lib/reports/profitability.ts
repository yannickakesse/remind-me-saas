import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

export interface ActivityProfitability {
  activityId: string | null;
  activityName: string;
  activityColor: string | null;
  currency: string;
  incomeReceived: number;
  incomeExpected: number;
  totalIncome: number;
  expensesPaid: number;
  expensesPlanned: number;
  totalExpenses: number;
  netRealProfit: number; // Reçus - Payées (Solde Réel)
  netProfit: number; // Total Revenus - Total Dépenses (Projection)
  totalHours: number;
  hourlyRate: number | null; // Net Real Profit / totalHours (si heures > 0)
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
  incomeReceived: number;
  incomeExpected: number;
  income: number;
  expensesPaid: number;
  expensesPlanned: number;
  expenses: number;
  netReal: number;
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
  // 1. Récupérer activités, revenus, dépenses et événements calendrier réels
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

  // 2. Calcul des heures travaillées réelles par activité depuis calendar_events
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

  // 3. Agrégation financière par activité et devise (avec séparation stricte Reçus / Attendus et Payées / Prévues)
  const actStats = new Map<
    string,
    {
      incomeReceived: number;
      incomeExpected: number;
      expensesPaid: number;
      expensesPlanned: number;
    }
  >();

  (incomeEntries ?? []).forEach((i) => {
    const actId = i.activity_id ?? "unassigned";
    const curr = i.currency;
    const key = `${actId}::${curr}`;
    const cur = actStats.get(key) ?? {
      incomeReceived: 0,
      incomeExpected: 0,
      expensesPaid: 0,
      expensesPlanned: 0,
    };
    if (i.received) {
      cur.incomeReceived += Number(i.amount);
    } else {
      cur.incomeExpected += Number(i.amount);
    }
    actStats.set(key, cur);
  });

  (expenseEntries ?? []).forEach((e) => {
    const actId = e.activity_id ?? "unassigned";
    const curr = e.currency;
    const key = `${actId}::${curr}`;
    const cur = actStats.get(key) ?? {
      incomeReceived: 0,
      incomeExpected: 0,
      expensesPaid: 0,
      expensesPlanned: 0,
    };
    if (e.paid) {
      cur.expensesPaid += Number(e.amount);
    } else {
      cur.expensesPlanned += Number(e.amount);
    }
    actStats.set(key, cur);
  });

  // 4. Construction de la liste de rentabilité par activité
  const profitabilityList: ActivityProfitability[] = [];

  actStats.forEach((val, key) => {
    const parts = key.split("::");
    const actId = parts[0] || "unassigned";
    const currency = parts[1] || "XOF";
    const actInfo = activityMap.get(actId);
    const hours = hoursByActivity.get(actId) ?? 0;
    const totalIncome = val.incomeReceived + val.incomeExpected;
    const totalExpenses = val.expensesPaid + val.expensesPlanned;
    const netRealProfit = val.incomeReceived - val.expensesPaid; // Solde Réel strict
    const netProfit = totalIncome - totalExpenses; // Projection
    const hourlyRate = hours > 0 ? Math.round(netRealProfit / hours) : null;

    profitabilityList.push({
      activityId: actId === "unassigned" ? null : actId,
      activityName: actInfo ? actInfo.name : "Général / Libre",
      activityColor: actInfo ? actInfo.color : null,
      currency,
      incomeReceived: val.incomeReceived,
      incomeExpected: val.incomeExpected,
      totalIncome,
      expensesPaid: val.expensesPaid,
      expensesPlanned: val.expensesPlanned,
      totalExpenses,
      netRealProfit,
      netProfit,
      totalHours: Math.round(hours * 10) / 10,
      hourlyRate,
    });
  });

  // Trier par bénéfice réel décroissant
  profitabilityList.sort((a, b) => b.netRealProfit - a.netRealProfit);
  const topItem = profitabilityList[0];
  if (topItem && topItem.hourlyRate && topItem.hourlyRate > 0) {
    topItem.isTopPerformer = true;
  }

  // 5. Ventilation des dépenses réelles payées par catégorie
  const catTotals = new Map<string, { amount: number; currency: string }>();
  let totalExpensesPaidOverall = 0;

  (expenseEntries ?? []).forEach((e) => {
    const cat = e.category || "other";
    const curr = e.currency;
    const key = `${cat}::${curr}`;
    const cur = catTotals.get(key) ?? { amount: 0, currency: curr };
    const amount = Number(e.amount);
    cur.amount += amount;
    catTotals.set(key, cur);
    if (e.paid) {
      totalExpensesPaidOverall += amount;
    }
  });

  const categoryBreakdown: CategoryBreakdownItem[] = [];
  catTotals.forEach((val, key) => {
    const parts = key.split("::");
    const cat = parts[0] || "other";
    const percentage =
      totalExpensesPaidOverall > 0 ? Math.round((val.amount / totalExpensesPaidOverall) * 100) : 0;
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

    let monthIncRec = 0;
    let monthIncExp = 0;
    let monthExpPaid = 0;
    let monthExpPlan = 0;
    let monthCurr = "XOF";

    (incomeEntries ?? []).forEach((i) => {
      if (i.due_date && i.due_date.startsWith(monthKey)) {
        if (i.received) {
          monthIncRec += Number(i.amount);
        } else {
          monthIncExp += Number(i.amount);
        }
        monthCurr = i.currency;
      }
    });

    (expenseEntries ?? []).forEach((e) => {
      if (e.due_date && e.due_date.startsWith(monthKey)) {
        if (e.paid) {
          monthExpPaid += Number(e.amount);
        } else {
          monthExpPlan += Number(e.amount);
        }
        monthCurr = e.currency;
      }
    });

    const monthTotalInc = monthIncRec + monthIncExp;
    const monthTotalExp = monthExpPaid + monthExpPlan;

    monthlySummaries.push({
      monthKey,
      monthLabel,
      incomeReceived: monthIncRec,
      incomeExpected: monthIncExp,
      income: monthTotalInc,
      expensesPaid: monthExpPaid,
      expensesPlanned: monthExpPlan,
      expenses: monthTotalExp,
      netReal: monthIncRec - monthExpPaid,
      net: monthTotalInc - monthTotalExp,
      currency: monthCurr,
    });
  }

  // Totaux globaux réels vs attendus
  const totalIncomeReceived = profitabilityList.reduce((acc, curr) => acc + curr.incomeReceived, 0);
  const totalIncomeExpected = profitabilityList.reduce((acc, curr) => acc + curr.incomeExpected, 0);
  const totalExpensesPaid = profitabilityList.reduce((acc, curr) => acc + curr.expensesPaid, 0);
  const totalExpensesPlanned = profitabilityList.reduce((acc, curr) => acc + curr.expensesPlanned, 0);
  const realNetBalance = totalIncomeReceived - totalExpensesPaid; // SOLDE RÉEL = REÇUS - DÉPENSES PAYÉES

  return {
    profitabilityList,
    categoryBreakdown,
    monthlySummaries,
    monthlyEvolution: monthlySummaries,
    totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
    totalIncomeReceived,
    totalIncomeExpected,
    totalExpensesPaid,
    totalExpensesPlanned,
    realNetBalance,
  };
}
