import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { expenseCategoryLabel } from "@/lib/validation/finances";
import { computeInsights, type Insight, type InsightSnapshot } from "./rules";

/**
 * Rassemble les données de l'utilisateur nécessaires aux analyses (lecture seule, droits RLS
 * de l'utilisateur) puis applique les règles. Requêtes bornées dans le temps (≈ 3 mois).
 */
export async function getUserInsights(supabase: SupabaseClient<Database>, userId: string): Promise<Insight[]> {
  const db = supabase as any;
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, default_currency, created_at")
    .eq("id", userId)
    .maybeSingle();

  const tz = profile?.timezone || "UTC";
  const now = DateTime.now().setZone(tz);
  const from = now.minus({ months: 2 }).startOf("month");
  const fromIso = from.toISODate()!;
  const fromTs = from.toUTC().toISO()!;
  const weekAhead = now.plus({ days: 8 }).toUTC().toISO()!;
  const twoMonthsAgo = now.minus({ days: 61 }).toUTC().toISO()!;
  const horizon = now.plus({ days: 8 }).toISODate()!;

  const [budgets, expenses, income, events, activities, tasks, scheduled, savings, goals, steps] = await Promise.all([
    supabase.from("budgets").select("id, category, monthly_limit, currency").eq("user_id", userId),
    supabase
      .from("expenses")
      .select("amount, currency, category, paid, paid_at, due_date")
      .eq("user_id", userId)
      .or(`due_date.gte.${fromIso},paid_at.gte.${fromTs}`),
    supabase
      .from("income")
      .select("amount, currency, received, received_at, due_date, label")
      .eq("user_id", userId)
      .or(`due_date.gte.${fromIso},received_at.gte.${fromTs}`),
    supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, status, activity_id, original_starts_at, is_exception")
      .eq("user_id", userId)
      .or(`and(starts_at.gte.${now.startOf("day").toUTC().toISO()},starts_at.lte.${weekAhead}),and(is_exception.eq.true,original_starts_at.gte.${twoMonthsAgo})`),
    supabase.from("activities").select("id, name").eq("user_id", userId),
    supabase.from("tasks").select("id, title, due_date, status").eq("user_id", userId).gte("due_date", now.toISODate()!).lte("due_date", horizon),
    supabase.from("scheduled_expenses").select("id, name, next_due_date, status").eq("user_id", userId).gte("next_due_date", now.toISODate()!).lte("next_due_date", horizon),
    supabase.from("savings_goals").select("id, name, target_amount, current_amount, updated_at, deadline").eq("user_id", userId),
    db.from("goals").select("*").eq("user_id", userId).eq("status", "active"),
    db.from("goal_steps").select("*").eq("user_id", userId),
  ]);

  const snapshot: InsightSnapshot = {
    timezone: tz,
    now: DateTime.now().toISO()!,
    currency: profile?.default_currency || "XOF",
    accountCreatedAt: profile?.created_at || DateTime.now().toISO()!,
    budgets: (budgets.data ?? []).map((b: any) => ({ ...b, monthly_limit: Number(b.monthly_limit), categoryLabel: expenseCategoryLabel(b.category) })),
    expenses: (expenses.data ?? []) as any,
    income: (income.data ?? []) as any,
    events: (events.data ?? []) as any,
    activities: (activities.data ?? []) as any,
    tasks: (tasks.data ?? []) as any,
    scheduledExpenses: (scheduled.data ?? []) as any,
    savingsGoals: (savings.data ?? []) as any,
    // Module « Mes Objectifs » absent tant que la migration 0027 n'est pas appliquée
    goals: goals.error ? [] : goals.data ?? [],
    goalSteps: steps.error ? [] : steps.data ?? [],
  };

  return computeInsights(snapshot);
}
