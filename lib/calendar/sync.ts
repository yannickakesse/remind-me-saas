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

  const scheduleIds = Array.from(new Set(candidates.map((c) => c.schedule_id!)));
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("schedule_id, starts_at, original_starts_at")
    .eq("user_id", userId)
    .in("schedule_id", scheduleIds);

  const covered = new Set<string>();
  for (const e of existing ?? []) {
    if (!e.schedule_id) continue;
    covered.add(`${e.schedule_id}|${normalizeIso(e.starts_at)}`);
    if (e.original_starts_at) {
      covered.add(`${e.schedule_id}|${normalizeIso(e.original_starts_at)}`);
    }
  }

  const toInsert = candidates.filter(
    (c) => !covered.has(`${c.schedule_id}|${normalizeIso(c.starts_at)}`)
  );
  if (toInsert.length === 0) return;

  // onConflict en filet de sécurité supplémentaire (comparaison d'instants
  // côté Postgres, insensible au format texte) en plus du filtrage ci-dessus.
  await supabase
    .from("calendar_events")
    .upsert(toInsert, { onConflict: "schedule_id,starts_at", ignoreDuplicates: true });
}
