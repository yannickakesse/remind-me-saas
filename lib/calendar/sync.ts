import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { generateOccurrencesForSchedule } from "./generate";

/**
 * Normalise un timestamp ISO (quel que soit le format d'offset renvoyé par
 * Postgres, ex. "+00:00" vs "Z") pour pouvoir comparer deux horodatages en
 * tant que chaînes sans divergence de formatage.
 */
function normalizeIso(iso: string): string {
  return DateTime.fromISO(iso, { setZone: true }).toUTC().toISO()!;
}

/**
 * S'assure que tous les événements de calendrier générables depuis les
 * horaires actifs de l'utilisateur existent bien en base pour la période
 * [rangeStart, rangeEnd] (dates ISO yyyy-MM-dd, bornes incluses).
 *
 * Génération paresseuse : appelée à chaque affichage du calendrier pour la
 * période consultée plutôt que par un job de fond — plus simple pour un
 * MVP, et bornée naturellement par la période réellement regardée par
 * l'utilisateur.
 *
 * Une occurrence déjà matérialisée (y compris si elle a été déplacée —
 * "reportée", donc son starts_at actuel diffère de l'horaire théorique)
 * n'est jamais dupliquée : on regarde à la fois starts_at et
 * original_starts_at des événements existants pour ce schedule_id.
 */
export async function ensureCalendarEvents(
  supabase: SupabaseClient<Database>,
  userId: string,
  rangeStart: string,
  rangeEnd: string,
  timezone: string
): Promise<void> {
  const { data: schedules } = await supabase
    .from("activity_schedules")
    .select(
      "id, activity_id, weekday, start_time, end_time, recurrence, created_at, activities!inner(id, name, status, start_date, end_date, user_id)"
    )
    .eq("user_id", userId)
    .eq("activities.status", "active");

  if (!schedules || schedules.length === 0) return;

  const from = DateTime.fromISO(rangeStart, { zone: timezone }).startOf("day");
  const to = DateTime.fromISO(rangeEnd, { zone: timezone }).endOf("day");

  type CandidateRow = Database["public"]["Tables"]["calendar_events"]["Insert"];
  const candidates: CandidateRow[] = [];

  for (const s of schedules) {
    const activity = Array.isArray(s.activities) ? s.activities[0] : s.activities;
    if (!activity) continue;

    const occurrences = generateOccurrencesForSchedule(
      {
        id: s.id,
        activityId: s.activity_id,
        weekday: s.weekday,
        startTime: s.start_time,
        endTime: s.end_time,
        recurrence: s.recurrence,
        activityStartDate: activity.start_date,
        activityEndDate: activity.end_date,
        createdAt: s.created_at,
      },
      from,
      to,
      timezone
    );

    for (const occ of occurrences) {
      candidates.push({
        user_id: userId,
        activity_id: occ.activityId,
        schedule_id: occ.scheduleId,
        title: activity.name,
        starts_at: occ.startsAt,
        ends_at: occ.endsAt,
        status: "planned",
      });
    }
  }

  if (candidates.length === 0) return;

  // Récupérer tous les événements existants sur cette période pour cet utilisateur
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id, activity_id, schedule_id, starts_at, original_starts_at, status")
    .eq("user_id", userId)
    .gte("starts_at", from.toUTC().toISO()!)
    .lte("starts_at", to.toUTC().toISO()!);

  const coveredByActivityAndSlot = new Set<string>();
  const duplicateIdsToDelete: string[] = [];

  for (const e of existing ?? []) {
    const normStart = normalizeIso(e.starts_at);
    const key = `${e.activity_id}|${normStart}`;

    if (coveredByActivityAndSlot.has(key) && e.status === "planned") {
      // Détection et suppression des doublons historiques
      duplicateIdsToDelete.push(e.id);
    } else {
      coveredByActivityAndSlot.add(key);
      if (e.original_starts_at) {
        coveredByActivityAndSlot.add(`${e.activity_id}|${normalizeIso(e.original_starts_at)}`);
      }
    }
  }

  // Nettoyage automatique des doublons existants
  if (duplicateIdsToDelete.length > 0) {
    await supabase.from("calendar_events").delete().in("id", duplicateIdsToDelete);
  }

  // Filtrer les candidats qui n'ont pas encore d'occurrence pour cette activité et ce créneau
  const toInsert = candidates.filter((c) => {
    const normStart = normalizeIso(c.starts_at);
    const key = `${c.activity_id}|${normStart}`;
    if (coveredByActivityAndSlot.has(key)) return false;
    coveredByActivityAndSlot.add(key);
    return true;
  });

  if (toInsert.length === 0) return;

  await supabase
    .from("calendar_events")
    .upsert(toInsert, { onConflict: "schedule_id,starts_at", ignoreDuplicates: true });
}
