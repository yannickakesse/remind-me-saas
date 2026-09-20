import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateIncomeOccurrences, isGenerableFrequency } from "./generate";

/**
 * S'assure que les échéances de revenu générables (fréquences
 * weekly/biweekly/monthly) existent bien en base pour la période
 * [rangeStart, rangeEnd] (dates ISO yyyy-MM-dd, bornes incluses)
 * et nettoie systématiquement tous les revenus orphelins d'activités supprimées.
 */
export async function ensureIncomeEntries(
  supabase: SupabaseClient<Database>,
  userId: string,
  rangeStartISO: string,
  rangeEndISO: string
): Promise<void> {
  const adminSupabase = createAdminClient();

  // 1. Récupérer toutes les activités actives et leurs rémunérations valides
  const [
    { data: activeActivities },
    { data: compensations },
    { data: allUnreceivedIncome },
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
      .select("id, label, compensation_id, activity_id, amount, currency, due_date, received")
      .eq("user_id", userId)
      .eq("received", false),
    supabase
      .from("income")
      .select("id, label, compensation_id, activity_id, amount, currency, due_date, received")
      .eq("user_id", userId)
      .gte("due_date", rangeStartISO)
      .lte("due_date", rangeEndISO),
  ]);

  const activeActivityIdSet = new Set((activeActivities ?? []).map((a) => a.id));
  const activeActivityNames = new Set((activeActivities ?? []).map((a) => a.name.toLowerCase().trim()));
  const activeCompensationIdSet = new Set((compensations ?? []).map((c) => c.id));

  // 2. Nettoyage global de TOUS les revenus orphelins ou supprimés non encaissés (received = false)
  const obsoleteIncomeIdsToDelete = new Set<string>();

  for (const inc of allUnreceivedIncome ?? []) {
    // Si c'est un revenu déjà encaissé (received = true), on conserve l'historique comptable réel
    if (inc.received) continue;

    // A. Revenu lié à une rémunération automatique dont l'activité ou la compensation n'est plus active
    if (inc.compensation_id && !activeCompensationIdSet.has(inc.compensation_id)) {
      obsoleteIncomeIdsToDelete.add(inc.id);
      continue;
    }

    // B. Revenu lié à une activité qui n'est plus active (supprimée ou archivée)
    if (inc.activity_id && !activeActivityIdSet.has(inc.activity_id)) {
      obsoleteIncomeIdsToDelete.add(inc.id);
      continue;
    }

    // C. Anciens revenus générés orphelins (qui avaient eu compensation_id ou activity_id détachés à null)
    if (!inc.compensation_id && !inc.activity_id && inc.label && inc.label.includes(" — ")) {
      const activityPrefix = inc.label.split(" — ")[0]?.toLowerCase().trim();
      if (activityPrefix && !activeActivityNames.has(activityPrefix)) {
        obsoleteIncomeIdsToDelete.add(inc.id);
        continue;
      }
    }
  }

  const deleteIdsList = Array.from(obsoleteIncomeIdsToDelete);
  if (deleteIdsList.length > 0) {
    await Promise.allSettled([
      supabase.from("income").delete().in("id", deleteIdsList).eq("user_id", userId),
      adminSupabase.from("income").delete().in("id", deleteIdsList).eq("user_id", userId),
    ]);
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

  // 3.5. Nettoyage des anciennes dates d'échéances non encaissées devenues obsolètes après changement de jour/fréquence
  const candidateKeys = new Set(candidates.map((c) => `${c.compensation_id}|${c.due_date}`));
  const staleDateIdsToDelete: string[] = [];

  for (const e of existingIncomeInPeriod ?? []) {
    if (e.compensation_id && !e.received && activeCompensationIdSet.has(e.compensation_id)) {
      const key = `${e.compensation_id}|${e.due_date}`;
      if (!candidateKeys.has(key)) {
        staleDateIdsToDelete.push(e.id);
        obsoleteIncomeIdsToDelete.add(e.id);
      }
    }
  }

  if (staleDateIdsToDelete.length > 0) {
    await Promise.allSettled([
      supabase.from("income").delete().in("id", staleDateIdsToDelete).eq("user_id", userId),
      adminSupabase.from("income").delete().in("id", staleDateIdsToDelete).eq("user_id", userId),
    ]);
  }

  // 4. Mettre à jour les montants si la rémunération d'une activité active a été modifiée
  const existingMap = new Map<string, { id: string; amount: number; received: boolean }>();
  (existingIncomeInPeriod ?? []).forEach((e) => {
    if (e.compensation_id && e.due_date && !obsoleteIncomeIdsToDelete.has(e.id)) {
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
