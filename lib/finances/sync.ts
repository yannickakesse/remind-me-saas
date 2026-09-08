import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { generateIncomeOccurrences, isGenerableFrequency } from "./generate";

/**
 * S'assure que les échéances de revenu générables (fréquences
 * weekly/biweekly/monthly) existent bien en base pour la période
 * [rangeStart, rangeEnd] (dates ISO yyyy-MM-dd, bornes incluses).
 *
 * Génération paresseuse, sur le même principe que
 * lib/calendar/sync.ts::ensureCalendarEvents : appelée à chaque affichage de
 * la page Finances pour la période consultée, jamais par un job de fond.
 * L'unicité (compensation_id, due_date) en base est le filet de sécurité
 * final contre les doublons ; le filtrage ci-dessous en est un premier
 * niveau pour éviter des requêtes inutiles.
 */
export async function ensureIncomeEntries(
  supabase: SupabaseClient<Database>,
  userId: string,
  rangeStartISO: string,
  rangeEndISO: string
): Promise<void> {
  const { data: compensations } = await supabase
    .from("activity_compensation")
    .select(
      "id, activity_id, frequency, amount, currency, payment_day, created_at, activities!inner(id, name, status, start_date, user_id)"
    )
    .eq("user_id", userId)
    .eq("activities.status", "active");

  if (!compensations || compensations.length === 0) return;

  type CandidateRow = Database["public"]["Tables"]["income"]["Insert"];
  const candidates: CandidateRow[] = [];

  for (const c of compensations) {
    if (!isGenerableFrequency(c.frequency)) continue;

    const activity = Array.isArray(c.activities) ? c.activities[0] : c.activities;
    if (!activity) continue;

    const occurrences = generateIncomeOccurrences(
      {
        id: c.id,
        activityId: c.activity_id,
        activityName: activity.name,
        frequency: c.frequency,
        amount: c.amount,
        currency: c.currency,
        paymentDay: c.payment_day,
        anchorDateISO: activity.start_date ?? c.created_at,
      },
      rangeStartISO,
      rangeEndISO
    );

    for (const occ of occurrences) {
      candidates.push({
        user_id: userId,
        activity_id: occ.activityId,
        compensation_id: occ.compensationId,
        label: occ.label,
        amount: occ.amount,
        currency: occ.currency,
        due_date: occ.dueDate,
      });
    }
  }

  if (candidates.length === 0) return;

  const compensationIds = Array.from(new Set(candidates.map((c) => c.compensation_id!)));
  const { data: existing } = await supabase
    .from("income")
    .select("compensation_id, due_date")
    .eq("user_id", userId)
    .in("compensation_id", compensationIds);

  const covered = new Set((existing ?? []).map((e) => `${e.compensation_id}|${e.due_date}`));
  const toInsert = candidates.filter((c) => !covered.has(`${c.compensation_id}|${c.due_date}`));
  if (toInsert.length === 0) return;

  // onConflict en filet de sécurité supplémentaire, en plus du filtrage
  // ci-dessus (même stratégie que ensureCalendarEvents).
  await supabase
    .from("income")
    .upsert(toInsert, { onConflict: "compensation_id,due_date", ignoreDuplicates: true });
}
