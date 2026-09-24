import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateIncomeOccurrences, isGenerableFrequency } from "./generate";

/**
 * S'assure que les échéances de revenu récurrentes et prévisionnelles
 * existent bien en base pour la période [rangeStart, rangeEnd] (dates ISO yyyy-MM-dd)
 * tout en garantissant une intégrité comptable et historique absolue (zéro perte de données).
 */
export async function ensureIncomeEntries(
  supabase: SupabaseClient<Database>,
  userId: string,
  rangeStartISO: string,
  rangeEndISO: string
): Promise<void> {
  const adminSupabase = createAdminClient();

  // 1. Récupérer toutes les activités de l'utilisateur (actives ou non pour préserver les jointures)
  const [
    { data: allUserActivities },
    { data: compensations },
    { data: existingIncomeInPeriod },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, status, start_date, end_date")
      .eq("user_id", userId),
    supabase
      .from("activity_compensation")
      .select(
        "id, activity_id, frequency, amount, currency, payment_day, created_at, activities!inner(id, name, status, start_date, end_date, user_id)"
      )
      .eq("user_id", userId),
    supabase
      .from("income")
      .select("id, label, compensation_id, activity_id, amount, currency, due_date, received")
      .eq("user_id", userId)
      .gte("due_date", rangeStartISO)
      .lte("due_date", rangeEndISO),
  ]);

  const activityMap = new Map((allUserActivities ?? []).map((a) => [a.id, a]));

  // 2. Génération des échéances prévisionnelles pour les rémunérations éligibles
  type CandidateRow = Database["public"]["Tables"]["income"]["Insert"];
  const candidates: CandidateRow[] = [];

  for (const c of compensations ?? []) {
    if (!isGenerableFrequency(c.frequency)) continue;

    const activity = Array.isArray(c.activities) ? c.activities[0] : c.activities;
    if (!activity) continue;

    // Si l'activité est explicitement suspendue ou archivée pour TOUTE la période, on ne génère pas de nouvelles échéances
    if (activity.status === "suspended" || activity.status === "archived") {
      continue;
    }

    const occurrences = generateIncomeOccurrences(
      {
        id: c.id,
        activityId: c.activity_id,
        activityName: activity.name,
        frequency: c.frequency,
        amount: Number(c.amount),
        currency: c.currency,
        paymentDay: c.payment_day,
        anchorDateISO: activity.start_date ?? c.created_at,
        startDateISO: activity.start_date,
        endDateISO: activity.end_date,
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

  // 3. Identification des entrées existantes sur la période
  const existingMap = new Map<string, { id: string; amount: number; received: boolean }>();
  (existingIncomeInPeriod ?? []).forEach((e) => {
    if (e.compensation_id && e.due_date) {
      existingMap.set(`${e.compensation_id}|${e.due_date}`, {
        id: e.id,
        amount: Number(e.amount),
        received: e.received,
      });
    }
  });

  const toInsert: CandidateRow[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.compensation_id}|${candidate.due_date}`;
    const existingEntry = existingMap.get(key);

    if (!existingEntry) {
      toInsert.push(candidate);
    } else if (!existingEntry.received && existingEntry.amount !== Number(candidate.amount)) {
      // Le montant a été ajusté sur l'activité et le revenu n'est pas encore encaissé -> mise à jour
      await Promise.allSettled([
        supabase
          .from("income")
          .update({
            amount: candidate.amount,
            currency: candidate.currency,
            label: candidate.label,
          })
          .eq("id", existingEntry.id)
          .eq("user_id", userId),
        adminSupabase
          .from("income")
          .update({
            amount: candidate.amount,
            currency: candidate.currency,
            label: candidate.label,
          })
          .eq("id", existingEntry.id)
          .eq("user_id", userId),
      ]);
    }
  }

  // 4. Insertion sécurisée et idempotente
  if (toInsert.length > 0) {
    await Promise.allSettled([
      supabase
        .from("income")
        .upsert(toInsert, { onConflict: "compensation_id,due_date", ignoreDuplicates: true }),
      adminSupabase
        .from("income")
        .upsert(toInsert, { onConflict: "compensation_id,due_date", ignoreDuplicates: true }),
    ]);
  }
}
