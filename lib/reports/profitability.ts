import { getServerLocale, getTr } from "@/lib/i18n/server";
import { splitReceivedIncome } from "@/lib/finances/income-kinds";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import {
  canCompare,
  compareValue,
  isIndicativeComparison,
  isRecurringExpense,
  periodCoverage,
  previousPeriod,
  trackingStartDate,
  upcomingScheduledOccurrences,
  workedHoursByActivity,
  type PeriodCoverage,
  type PeriodGranularity,
  type ScheduledExpenseRow,
  type SessionRow,
  type ValueDelta,
} from "@/lib/reports/periods";

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
  /** Ligne « Général » : revenus et dépenses non rattachés à une activité (jamais répartis). */
  isGeneral?: boolean;
  /** Données incomplètes : heures sans montants, ou montants sans heures. */
  incomplete?: boolean;
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
  /** « none » = pas de données : à afficher comme un trou, jamais comme un zéro. */
  coverage: PeriodCoverage;
}

export interface PeriodTotals {
  incomeReceived: number;
  incomeExpected: number;
  expensesPaid: number;
  expensesPlanned: number;
  realNetBalance: number;
}

export interface PeriodComparison {
  start: string;
  end: string;
  granularity: PeriodGranularity;
  coverage: PeriodCoverage;
  /** null si la période précédente n'a pas de données : aucune comparaison n'est affichée. */
  deltas: null | {
    indicative: boolean;
    incomeReceived: ValueDelta;
    incomeExpected: ValueDelta;
    expensesPaid: ValueDelta;
    realNetBalance: ValueDelta;
  };
}

type IncomeInput = {
  activity_id: string | null;
  amount: number | string;
  currency: string | null;
  due_date: string;
  received: boolean;
  income_type?: string | null;
  compensation_id?: string | null;
};
type ExpenseInput = {
  activity_id: string | null;
  category: string | null;
  amount: number | string;
  currency: string | null;
  due_date: string;
  paid: boolean;
  label?: string;
  notes?: string | null;
};

export interface ReportInput {
  activities: Array<{ id: string; name: string; color: string | null }>;
  income: IncomeInput[];
  expenses: ExpenseInput[];
  sessions: SessionRow[];
  scheduled: ScheduledExpenseRow[];
  startDate: string;
  endDate: string;
  timezone: string;
  defaultCurrency: string;
  /** Date locale du jour (fuseau de l'utilisateur). */
  today: string;
  now?: DateTime;
  accountCreatedAt?: string | null;
  earliestOperationDate?: string | null;
  locale?: string;
  labels?: { general: string; generalIncome: string };
}

const sum = (rows: Array<{ amount: number | string }>) => rows.reduce((a, r) => a + Number(r.amount), 0);

function totalsFor(income: IncomeInput[], expenses: ExpenseInput[], start: string, end: string, currency: string): PeriodTotals {
  const inc = income.filter((i) => i.due_date >= start && i.due_date <= end && (i.currency || currency) === currency);
  const exp = expenses.filter((e) => e.due_date >= start && e.due_date <= end && (e.currency || currency) === currency);
  const incomeReceived = sum(inc.filter((i) => i.received));
  const expensesPaid = sum(exp.filter((e) => e.paid));
  return {
    incomeReceived,
    incomeExpected: sum(inc.filter((i) => !i.received)),
    expensesPaid,
    expensesPlanned: sum(exp.filter((e) => !e.paid)),
    realNetBalance: incomeReceived - expensesPaid,
  };
}

function operationCount(income: IncomeInput[], expenses: ExpenseInput[], start: string, end: string): number {
  const inRange = (d: string) => d >= start && d <= end;
  return income.filter((i) => inRange(i.due_date)).length + expenses.filter((e) => inRange(e.due_date)).length;
}

/**
 * Calcul pur du rapport (aucun accès à la base) : testé par scripts/test-reports-lot-a.ts.
 * Les montants sont toujours dans la devise principale ; les autres devises sont listées à part, jamais additionnées.
 */
export function buildProfitabilityReport(input: ReportInput) {
  const {
    startDate,
    endDate,
    timezone,
    defaultCurrency,
    today,
    income: incomeEntries,
    expenses: expenseEntries,
  } = input;
  const labels = input.labels ?? { general: "Général / Libre", generalIncome: "Revenu Général / Libre" };
  const now = input.now ?? DateTime.now().setZone(timezone);

  const activityMap = new Map<string, { name: string; color: string | null }>();
  input.activities.forEach((a) => activityMap.set(a.id, { name: a.name, color: a.color }));

  const periodIncome = incomeEntries.filter((i) => i.due_date >= startDate && i.due_date <= endDate);
  const periodExpenses = expenseEntries.filter((e) => e.due_date >= startDate && e.due_date <= endDate);

  // Couverture : début du suivi = création du compte ou première opération, la plus ancienne des deux
  const accountCreatedDate = input.accountCreatedAt
    ? DateTime.fromISO(input.accountCreatedAt, { zone: timezone }).toISODate()
    : null;
  const trackingStart = trackingStartDate(accountCreatedDate, input.earliestOperationDate);
  const coverage = periodCoverage({
    start: startDate,
    end: endDate,
    today,
    trackingStart,
    operationCount: operationCount(incomeEntries, expenseEntries, startDate, endDate),
  });

  // Heures réellement travaillées (jamais d'heures futures, bornes dans le fuseau de l'utilisateur)
  const { byActivity: hoursByActivity, total: totalHoursWorked } = workedHoursByActivity(
    input.sessions,
    startDate,
    endDate,
    timezone,
    now
  );

  // Agrégation par activité et devise (séparation stricte Reçus / Attendus et Payées / Prévues)
  const actStats = new Map<string, { incomeReceived: number; incomeExpected: number; expensesPaid: number; expensesPlanned: number }>();
  const blank = () => ({ incomeReceived: 0, incomeExpected: 0, expensesPaid: 0, expensesPlanned: 0 });

  periodIncome.forEach((i) => {
    const key = `${i.activity_id ?? "unassigned"}::${i.currency || defaultCurrency}`;
    const cur = actStats.get(key) ?? blank();
    if (i.received) cur.incomeReceived += Number(i.amount);
    else cur.incomeExpected += Number(i.amount);
    actStats.set(key, cur);
  });
  periodExpenses.forEach((e) => {
    const key = `${e.activity_id ?? "unassigned"}::${e.currency || defaultCurrency}`;
    const cur = actStats.get(key) ?? blank();
    if (e.paid) cur.expensesPaid += Number(e.amount);
    else cur.expensesPlanned += Number(e.amount);
    actStats.set(key, cur);
  });
  // Une activité avec des heures mais sans aucun montant apparaît aussi (données incomplètes)
  hoursByActivity.forEach((_h, actId) => {
    if (actId === "unassigned") return;
    const has = Array.from(actStats.keys()).some((k) => k.startsWith(`${actId}::`));
    if (!has) actStats.set(`${actId}::${defaultCurrency}`, blank());
  });

  const profitabilityList: ActivityProfitability[] = [];
  actStats.forEach((val, key) => {
    const [actId = "unassigned", currency = defaultCurrency] = key.split("::");
    const actInfo = activityMap.get(actId);
    const isGeneral = actId === "unassigned";
    const hours = hoursByActivity.get(actId) ?? 0;
    const totalIncome = val.incomeReceived + val.incomeExpected;
    const totalExpenses = val.expensesPaid + val.expensesPlanned;
    const netRealProfit = val.incomeReceived - val.expensesPaid;
    const hasMoney = totalIncome > 0 || totalExpenses > 0;
    profitabilityList.push({
      activityId: isGeneral ? null : actId,
      activityName: actInfo ? actInfo.name : labels.general,
      activityColor: actInfo ? actInfo.color : null,
      currency,
      incomeReceived: val.incomeReceived,
      incomeExpected: val.incomeExpected,
      totalIncome,
      expensesPaid: val.expensesPaid,
      expensesPlanned: val.expensesPlanned,
      totalExpenses,
      netRealProfit,
      netProfit: totalIncome - totalExpenses,
      totalHours: Math.round(hours * 10) / 10,
      hourlyRate: hours > 0 ? Math.round(netRealProfit / hours) : null,
      isGeneral,
      incomplete: !isGeneral && ((hours > 0 && !hasMoney) || (hours === 0 && hasMoney)),
    });
  });

  profitabilityList.sort((a, b) => b.netRealProfit - a.netRealProfit);
  const topItem = profitabilityList.find((p) => !p.isGeneral);
  if (topItem && topItem.hourlyRate && topItem.hourlyRate > 0) topItem.isTopPerformer = true;

  // Répartition des dépenses PAYÉES par catégorie (devise principale) ; les prévues sont listées à part
  const breakdown = <T,>(rows: T[], keyOf: (r: T) => string, amountOf: (r: T) => number): CategoryBreakdownItem[] => {
    const totals = new Map<string, number>();
    rows.forEach((r) => totals.set(keyOf(r), (totals.get(keyOf(r)) ?? 0) + amountOf(r)));
    const all = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    return Array.from(totals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        currency: defaultCurrency,
        percentage: all > 0 ? Math.round((amount / all) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  };
  const mainExpenses = periodExpenses.filter((e) => (e.currency || defaultCurrency) === defaultCurrency);
  const paidExpenses = mainExpenses.filter((e) => e.paid);
  const categoryBreakdown = breakdown(paidExpenses, (e) => e.category || "other", (e) => Number(e.amount));
  const plannedCategoryBreakdown = breakdown(
    mainExpenses.filter((e) => !e.paid),
    (e) => e.category || "other",
    (e) => Number(e.amount)
  );

  // Répartition des revenus ENCAISSÉS par source (devise principale), remboursements exclus (pas un gain)
  const mainIncome = periodIncome.filter((i) => (i.currency || defaultCurrency) === defaultCurrency);
  const incomeBreakdown = breakdown(
    mainIncome.filter((i) => i.received && i.income_type !== "refund"),
    (i) => activityMap.get(i.activity_id ?? "")?.name ?? labels.generalIncome,
    (i) => Number(i.amount)
  );

  // Dépenses payées : récurrentes (issues de l'échéancier) / ponctuelles — estimation pour les anciennes lignes
  const recurringPaid = sum(paidExpenses.filter((e) => isRecurringExpense(e.notes)));
  const expenseKinds = { recurringPaid, ponctualPaid: sum(paidExpenses) - recurringPaid };

  // Dépenses à venir : prévues enregistrées + échéances programmées pas encore enregistrées
  const upcoming = upcomingScheduledOccurrences(
    input.scheduled.filter((s) => s.currency === defaultCurrency),
    startDate > today ? startDate : today,
    endDate,
    expenseEntries.map((e) => ({ label: e.label ?? "", due_date: e.due_date, amount: e.amount }))
  );
  const scheduledUpcoming = { total: sum(upcoming), count: upcoming.length };

  // Évolution mensuelle (12 derniers mois ; l'écran gratuit en montre 6) : un mois sans données est marqué « none », jamais présenté comme un zéro
  const endDT = DateTime.fromISO(endDate, { zone: timezone });
  const locale = input.locale ?? "fr";
  const monthlySummaries: MonthlySummaryItem[] = [];
  for (let m = 11; m >= 0; m--) {
    const mDT = endDT.minus({ months: m });
    const mStart = mDT.startOf("month").toISODate()!;
    const mEnd = mDT.endOf("month").toISODate()!;
    const t = totalsFor(incomeEntries, expenseEntries, mStart, mEnd, defaultCurrency);
    monthlySummaries.push({
      monthKey: mDT.toFormat("yyyy-MM"),
      monthLabel: mDT.setLocale(locale).toFormat("MMM yyyy"),
      incomeReceived: t.incomeReceived,
      incomeExpected: t.incomeExpected,
      income: t.incomeReceived + t.incomeExpected,
      expensesPaid: t.expensesPaid,
      expensesPlanned: t.expensesPlanned,
      expenses: t.expensesPaid + t.expensesPlanned,
      netReal: t.realNetBalance,
      net: t.incomeReceived + t.incomeExpected - t.expensesPaid - t.expensesPlanned,
      currency: defaultCurrency,
      coverage: periodCoverage({
        start: mStart,
        end: mEnd,
        today,
        trackingStart,
        operationCount: operationCount(incomeEntries, expenseEntries, mStart, mEnd),
      }),
    });
  }

  // Totaux par devise (aucun mélange de devises)
  const currencyTotals = new Map<string, PeriodTotals>();
  profitabilityList.forEach((p) => {
    const cur = currencyTotals.get(p.currency) ?? { incomeReceived: 0, incomeExpected: 0, expensesPaid: 0, expensesPlanned: 0, realNetBalance: 0 };
    cur.incomeReceived += p.incomeReceived;
    cur.incomeExpected += p.incomeExpected;
    cur.expensesPaid += p.expensesPaid;
    cur.expensesPlanned += p.expensesPlanned;
    cur.realNetBalance += p.netRealProfit;
    currencyTotals.set(p.currency, cur);
  });
  const primaryTotals = currencyTotals.get(defaultCurrency) ?? { incomeReceived: 0, incomeExpected: 0, expensesPaid: 0, expensesPlanned: 0, realNetBalance: 0 };
  const otherCurrencies = Array.from(currencyTotals.entries())
    .filter(([c]) => c !== defaultCurrency)
    .map(([currency, v]) => ({ currency, ...v }));

  // Rentabilité horaire : activités uniquement (les dépenses générales ne sont jamais réparties)
  const activityRows = profitabilityList.filter((p) => !p.isGeneral && p.currency === defaultCurrency);
  const activityNet = activityRows.reduce((a, p) => a + p.netRealProfit, 0);
  let activityHours = 0;
  hoursByActivity.forEach((h, id) => {
    if (id !== "unassigned") activityHours += h;
  });
  const averageHourlyRate = activityHours > 0 ? Math.round(activityNet / activityHours) : null;
  const globalHourlyRate = totalHoursWorked > 0 ? Math.round(primaryTotals.realNetBalance / totalHoursWorked) : null;

  // Comparaison avec la période précédente de même nature (uniquement si elle a des données)
  const prev = previousPeriod(startDate, endDate);
  const prevCoverage = periodCoverage({
    start: prev.start,
    end: prev.end,
    today,
    trackingStart,
    operationCount: operationCount(incomeEntries, expenseEntries, prev.start, prev.end),
  });
  const prevTotals = totalsFor(incomeEntries, expenseEntries, prev.start, prev.end, defaultCurrency);
  const previousCategoryBreakdown = breakdown(
    expenseEntries.filter(
      (e) => e.paid && e.due_date >= prev.start && e.due_date <= prev.end && (e.currency || defaultCurrency) === defaultCurrency
    ),
    (e) => e.category || "other",
    (e) => Number(e.amount)
  );
  const comparison: PeriodComparison = {
    ...prev,
    coverage: prevCoverage,
    deltas:
      coverage !== "none" && canCompare(coverage, prevCoverage)
        ? {
            indicative: isIndicativeComparison(coverage, prevCoverage),
            incomeReceived: compareValue(primaryTotals.incomeReceived, prevTotals.incomeReceived),
            incomeExpected: compareValue(primaryTotals.incomeExpected, prevTotals.incomeExpected),
            expensesPaid: compareValue(primaryTotals.expensesPaid, prevTotals.expensesPaid),
            realNetBalance: compareValue(primaryTotals.realNetBalance, prevTotals.realNetBalance),
          }
        : null,
  };

  return {
    profitabilityList,
    categoryBreakdown,
    plannedCategoryBreakdown,
    incomeBreakdown,
    monthlySummaries,
    /** Compatibilité : uniquement les mois avec des données (les mois « none » ne sont jamais tracés à zéro). */
    monthlyEvolution: monthlySummaries.slice(-6).filter((m) => m.coverage !== "none"),
    /** Dépenses payées par catégorie sur la période précédente (pour « ce qui a changé »). */
    previousCategoryBreakdown,
    totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
    activityHours: Math.round(activityHours * 10) / 10,
    averageHourlyRate,
    globalHourlyRate,
    totalIncomeReceived: primaryTotals.incomeReceived,
    totalIncomeExpected: primaryTotals.incomeExpected,
    totalExpensesPaid: primaryTotals.expensesPaid,
    totalExpensesPlanned: primaryTotals.expensesPlanned,
    /** Dépenses à venir = prévues enregistrées + échéances programmées non encore enregistrées. */
    totalExpensesUpcoming: primaryTotals.expensesPlanned + scheduledUpcoming.total,
    scheduledUpcoming,
    expenseKinds,
    realNetBalance: primaryTotals.realNetBalance,
    otherCurrencies,
    coverage,
    trackingStart,
    comparison,
    // Part des revenus reçus (devise principale) : exceptionnels et remboursements, déjà inclus dans le total
    receivedIncomeSplit: splitReceivedIncome(mainIncome as any),
  };
}

export async function calculateProfitabilityReport(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
  timezone: string = "UTC",
  defaultCurrency: string = "XOF",
  accountCreatedAt?: string | null
) {
  // Libellés traduits ; hors requête (scripts), repli sur le français
  let tr: (k: string) => string = (k) => k;
  let locale = "fr";
  try {
    tr = await getTr();
    locale = getServerLocale();
  } catch {
    // hors requête : français par défaut
  }
  const endDT = DateTime.fromISO(endDate, { zone: timezone });
  const historyStart = endDT.minus({ months: 11 }).startOf("month").toISODate()!;
  const prev = previousPeriod(startDate, endDate);
  const fetchStart = [startDate, historyStart, prev.start].sort()[0];
  // Séances : bornes calculées dans le fuseau de l'utilisateur, séances qui chevauchent la période incluses
  const sessionsFrom = DateTime.fromISO(startDate, { zone: timezone }).startOf("day").toUTC().toISO()!;
  const sessionsTo = DateTime.fromISO(endDate, { zone: timezone }).endOf("day").toUTC().toISO()!;

  const [
    { data: activities },
    { data: incomeEntries },
    { data: expenseEntries },
    { data: calendarEvents },
    { data: scheduled },
    { data: firstIncome },
    { data: firstExpense },
  ] = await Promise.all([
    supabase.from("activities").select("id, name, color").eq("user_id", userId),
    supabase
      .from("income")
      .select("id, activity_id, amount, currency, due_date, received, income_type, compensation_id")
      .eq("user_id", userId)
      .gte("due_date", fetchStart)
      .lte("due_date", endDate),
    supabase
      .from("expenses")
      .select("id, activity_id, category, amount, currency, due_date, paid, label, notes")
      .eq("user_id", userId)
      .gte("due_date", fetchStart)
      .lte("due_date", endDate),
    supabase
      .from("calendar_events")
      .select("id, activity_id, starts_at, ends_at, status")
      .eq("user_id", userId)
      .lt("starts_at", sessionsTo)
      .gt("ends_at", sessionsFrom)
      .neq("status", "cancelled"),
    supabase
      .from("scheduled_expenses")
      .select("name, amount, currency, frequency, next_due_date, end_date, status, category, activity_id")
      .eq("user_id", userId)
      .in("status", ["planned", "due"])
      .lte("next_due_date", endDate),
    supabase.from("income").select("due_date").eq("user_id", userId).order("due_date", { ascending: true }).limit(1),
    supabase.from("expenses").select("due_date").eq("user_id", userId).order("due_date", { ascending: true }).limit(1),
  ]);

  const earliestOperationDate =
    [firstIncome?.[0]?.due_date, firstExpense?.[0]?.due_date].filter((d): d is string => !!d).sort()[0] ?? null;

  return buildProfitabilityReport({
    activities: activities ?? [],
    income: (incomeEntries ?? []) as IncomeInput[],
    expenses: (expenseEntries ?? []) as ExpenseInput[],
    sessions: (calendarEvents ?? []) as SessionRow[],
    scheduled: (scheduled ?? []) as ScheduledExpenseRow[],
    startDate,
    endDate,
    timezone,
    defaultCurrency,
    today: DateTime.now().setZone(timezone).toISODate()!,
    accountCreatedAt,
    earliestOperationDate,
    locale,
    labels: { general: tr("Général / Libre"), generalIncome: tr("Revenu Général / Libre") },
  });
}
