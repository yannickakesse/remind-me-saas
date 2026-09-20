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
  // 1. Récupérer toutes les activités actives et leurs rémunérations valides
  const [
    { data: activeActivities },
    { data: compensations },
    { data: existingIncomeInPeriod },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, status")
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase
      .from("activity_compensation")
      .select(
        "id, activity_id, frequency, amount, currency, payment_day, created_at, activities!inner(id, name, status, start_date, user_id)"
      )
      .eq("user_id", userId)
      .eq("activities.status", "active"),
    supabase
      .from("income")
      .select("id, compensation_id, activity_id, amount, currency, due_date, received")
      .eq("user_id", userId)
      .gte("due_date", rangeStartISO)
      .lte("due_date", rangeEndISO),
  ]);

  const activeActivityIdSet = new Set((activeActivities ?? []).map((a) => a.id));
  const activeCompensationIdSet = new Set((compensations ?? []).map((c) => c.id));

  // 2. Nettoyage des orphelins ou activités supprimées / archivées sur les entrées NON encaissées (received = false)
  const obsoleteIncomeIdsToDelete: string[] = [];
  for (const inc of existingIncomeInPeriod ?? []) {
    // Si c'est un revenu déjà encaissé (received = true), on conserve l'historique comptable réel
    if (inc.received) continue;

    // A. Revenu lié à une rémunération automatique dont l'activité ou la compensation n'est plus active
    if (inc.compensation_id && !activeCompensationIdSet.has(inc.compensation_id)) {
      obsoleteIncomeIdsToDelete.push(inc.id);
      continue;
    }

    // B. Revenu lié à une activité qui n'est plus active (supprimée ou archivée)
    if (inc.activity_id && !activeActivityIdSet.has(inc.activity_id)) {
      obsoleteIncomeIdsToDelete.push(inc.id);
      continue;
    }
  }

  if (obsoleteIncomeIdsToDelete.length > 0) {
    await supabase
      .from("income")
      .delete()
      .in("id", obsoleteIncomeIdsToDelete)
      .eq("user_id", userId);
  }

  // 3. Génération des candidats attendus pour les rémunérations actives
  type CandidateRow = Database["public"]["Tables"]["income"]["Insert"];
  const candidates: CandidateRow[] = [];

  for (const c of compensations ?? []) {
    if (!isGenerableFrequency(c.frequency)) continue;

    const activity = Array.isArray(c.activities) ? c.activities[0] : c.activities;
    if (!activity) continue;

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

  // 4. Mettre à jour les montants si la rémunération d'une activité active a été modifiée
  const existingMap = new Map<string, { id: string; amount: number; received: boolean }>();
  (existingIncomeInPeriod ?? []).forEach((e) => {
    if (e.compensation_id && e.due_date && !obsoleteIncomeIdsToDelete.includes(e.id)) {
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
      // Le montant a changé dans l'activité et le revenu n'est pas encore encaissé -> mise à jour immédiate
      await supabase
        .from("income")
        .update({
          amount: candidate.amount,
          currency: candidate.currency,
          label: candidate.label,
        })
        .eq("id", existingEntry.id)
        .eq("user_id", userId);
    }
  }

  if (toInsert.length > 0) {
    await supabase
      .from("income")
      .upsert(toInsert, { onConflict: "compensation_id,due_date", ignoreDuplicates: true });
  }
}
