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
  // 1. Récupération optimisée en parallèle des rémunérations et des entrées déjà enregistrées
  const [
    { data: compensations },
    { data: existingIncomeInPeriod },
  ] = await Promise.all([
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

  if (!compensations || compensations.length === 0) {
    return;
  }

  // 2. Génération des échéances prévisionnelles en mémoire pour les rémunérations éligibles
  type CandidateRow = Database["public"]["Tables"]["income"]["Insert"];
  const candidates: CandidateRow[] = [];

  for (const c of compensations) {
    if (!isGenerableFrequency(c.frequency)) continue;

    const activity = Array.isArray(c.activities) ? c.activities[0] : c.activities;
    if (!activity) continue;

    // Si l'activité est suspendue ou archivée, pas de nouvelles échéances
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

  if (candidates.length === 0) return;

  // 3. Indexation des entrées existantes sur la période
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
  const updatePromises: Promise<any>[] = [];

  // 4. Exécution groupée et idempotente des écritures (uniquement si nécessaire)
  for (const candidate of candidates) {
    const key = `${candidate.compensation_id}|${candidate.due_date}`;
    const existingEntry = existingMap.get(key);

    if (!existingEntry) {
      toInsert.push(candidate);
    } else if (!existingEntry.received && existingEntry.amount !== Number(candidate.amount)) {
      // Le montant a été ajusté sur l'activité et le revenu n'est pas encore encaissé -> mise à jour
      updatePromises.push(
        Promise.resolve(
          supabase
            .from("income")
            .update({
              amount: candidate.amount,
              currency: candidate.currency,
              label: candidate.label,
            })
            .eq("id", existingEntry.id)
            .eq("user_id", userId)
        )
      );
    }
  }

  const tasks: Promise<any>[] = [];
  if (updatePromises.length > 0) {
    tasks.push(Promise.allSettled(updatePromises));
  }
  if (toInsert.length > 0) {
    tasks.push(
      Promise.resolve(
        supabase
          .from("income")
          .upsert(toInsert, { onConflict: "compensation_id,due_date", ignoreDuplicates: true })
      )
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}
