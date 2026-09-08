import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { deriveFinanceStatus, type FinanceStatus } from "@/lib/validation/finances";

// ----------------------------------------------------------------------------
// Requête + dérivation de statut partagées entre la page /finances et
// l'export CSV (app/api/finances/export) : un seul endroit qui sait
// interroger income/expenses et calculer leur statut affiché, pour ne
// jamais laisser les deux diverger.
//
// Ne fait PAS la génération paresseuse (ensureIncomeEntries) : c'est à
// l'appelant de la déclencher avant, comme la page le fait déjà.
// ----------------------------------------------------------------------------

export type IncomeRow = {
  id: string;
  label: string;
  amount: number;
  currency: string;
  due_date: string;
  received: boolean;
  received_at: string | null;
  compensation_id: string | null;
  notes: string | null;
  activity_id: string | null;
  activity: { name: string; color: string | null } | null;
  status: FinanceStatus;
};

export type ExpenseRow = {
  id: string;
  label: string;
  category: string | null;
  amount: number;
  currency: string;
  due_date: string;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  activity_id: string | null;
  activity: { name: string; color: string | null } | null;
  status: FinanceStatus;
};

export type FinancesForRange = {
  income: IncomeRow[];
  expenses: ExpenseRow[];
};

export async function getFinancesForRange(
  supabase: SupabaseClient<Database>,
  userId: string,
  rangeStartISO: string,
  rangeEndISO: string,
  todayISO: string
): Promise<FinancesForRange> {
  const [{ data: rawIncome, error: incomeError }, { data: rawExpenses, error: expensesError }] = await Promise.all([
    supabase
      .from("income")
      .select(
        "id, label, amount, currency, due_date, received, received_at, compensation_id, notes, activity_id, activities(name, color)"
      )
      .eq("user_id", userId)
      .gte("due_date", rangeStartISO)
      .lte("due_date", rangeEndISO)
      .order("due_date", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, label, category, amount, currency, due_date, paid, paid_at, notes, activity_id, activities(name, color)")
      .eq("user_id", userId)
      .gte("due_date", rangeStartISO)
      .lte("due_date", rangeEndISO)
      .order("due_date", { ascending: true }),
  ]);

  if (incomeError) throw incomeError;
  if (expensesError) throw expensesError;

  const income: IncomeRow[] = (rawIncome ?? []).map((i) => ({
    ...i,
    activity: Array.isArray(i.activities) ? i.activities[0] ?? null : i.activities,
    status: deriveFinanceStatus(i.received, i.due_date, todayISO),
  }));

  const expenses: ExpenseRow[] = (rawExpenses ?? []).map((e) => ({
    ...e,
    activity: Array.isArray(e.activities) ? e.activities[0] ?? null : e.activities,
    status: deriveFinanceStatus(e.paid, e.due_date, todayISO),
  }));

  return { income, expenses };
}

/**
 * Totaux par (statut, devise) — réutilisé par la page pour les badges de
 * synthèse et disponible pour un futur résumé sur l'export.
 */
export function sumByCurrencyAndStatus<T extends { amount: number; currency: string; status: FinanceStatus }>(
  rows: T[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.status}|${row.currency}`;
    totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }
  return totals;
}

/**
 * Décompose une clé "statut|devise" produite par sumByCurrencyAndStatus.
 * Centralisé ici pour éviter que chaque appelant refasse un split("|")[1]
 * non typé (source du bug currency: string | undefined corrigé sur
 * /finances).
 */
export function splitTotalsKey(key: string): { status: FinanceStatus; currency: string } {
  const separatorIndex = key.indexOf("|");
  return {
    status: key.slice(0, separatorIndex) as FinanceStatus,
    currency: key.slice(separatorIndex + 1),
  };
}

export type ActivitySummaryRow = {
  activityId: string | null;
  activityName: string;
  currency: string;
  income: number;
  expenses: number;
};

/**
 * Regroupe revenus + dépenses par (activité, devise) pour le rapport
 * "Statistiques par activité" — additionne les montants réels aussi bien
 * que prévus, peu importe leur statut : contrairement aux totaux de
 * /finances (qui distinguent prévu/reçu/en retard/futur), un rapport sur
 * une période passée n'a pas besoin de cette distinction, il additionne
 * tout ce qui est dû sur la période demandée.
 */
export function summarizeByActivity(income: IncomeRow[], expenses: ExpenseRow[]): ActivitySummaryRow[] {
  const rows = new Map<string, ActivitySummaryRow>();

  function bucket(activityId: string | null, activityName: string, currency: string): ActivitySummaryRow {
    const key = `${activityId ?? "none"}|${currency}`;
    let row = rows.get(key);
    if (!row) {
      row = { activityId, activityName, currency, income: 0, expenses: 0 };
      rows.set(key, row);
    }
    return row;
  }

  for (const i of income) {
    bucket(i.activity_id, i.activity?.name ?? "Sans activité", i.currency).income += i.amount;
  }
  for (const e of expenses) {
    bucket(e.activity_id, e.activity?.name ?? "Sans activité", e.currency).expenses += e.amount;
  }

  return Array.from(rows.values()).sort((a, b) => a.activityName.localeCompare(b.activityName));
}
