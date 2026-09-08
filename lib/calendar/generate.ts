import { DateTime } from "luxon";

export type ScheduleRecurrence = "weekly" | "biweekly" | "custom";

export interface ScheduleForGeneration {
  id: string;
  activityId: string;
  /** Convention DB (comme Postgres `extract(dow from ...)`) : 0 = dimanche ... 6 = samedi. */
  weekday: number;
  /** "HH:mm" ou "HH:mm:ss" */
  startTime: string;
  endTime: string;
  recurrence: ScheduleRecurrence;
  /** Date ISO (yyyy-MM-dd) ou null. */
  activityStartDate: string | null;
  activityEndDate: string | null;
  /** Horodatage ISO de création de l'horaire — sert d'ancre biweekly à défaut de date de début d'activité. */
  createdAt: string;
}

export interface GeneratedOccurrence {
  scheduleId: string;
  activityId: string;
  /** Date ISO (yyyy-MM-dd) locale au fuseau fourni. */
  date: string;
  /** ISO UTC. */
  startsAt: string;
  endsAt: string;
}

function parseHms(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":");
  return { hour: Number(h), minute: Number(m) };
}

/**
 * Calcule toutes les occurrences d'un horaire récurrent qui tombent dans
 * l'intervalle [rangeStart, rangeEnd] (bornes incluses), en tenant compte
 * de la date de début/fin de l'activité et, pour la récurrence "biweekly",
 * de la semaine d'ancrage (date de début de l'activité, sinon date de
 * création de l'horaire).
 *
 * La récurrence "custom" ne génère rien automatiquement : ces horaires
 * variables restent gérés via des événements créés manuellement.
 */
export function generateOccurrencesForSchedule(
  schedule: ScheduleForGeneration,
  rangeStart: DateTime,
  rangeEnd: DateTime,
  timezone: string
): GeneratedOccurrence[] {
  if (schedule.recurrence === "custom") return [];

  let from = rangeStart.startOf("day");
  let to = rangeEnd.endOf("day");

  if (schedule.activityStartDate) {
    const activityStart = DateTime.fromISO(schedule.activityStartDate, { zone: timezone }).startOf("day");
    if (activityStart > from) from = activityStart;
  }
  if (schedule.activityEndDate) {
    const activityEnd = DateTime.fromISO(schedule.activityEndDate, { zone: timezone }).endOf("day");
    if (activityEnd < to) to = activityEnd;
  }
  if (from > to) return [];

  // Luxon : 1 = lundi ... 7 = dimanche. Notre convention DB : 0 = dimanche ... 6 = samedi.
  const targetLuxonWeekday = schedule.weekday === 0 ? 7 : schedule.weekday;

  let cursor = from.set({ weekday: targetLuxonWeekday as 1 | 2 | 3 | 4 | 5 | 6 | 7 });
  if (cursor < from) cursor = cursor.plus({ weeks: 1 });

  const anchorSource = schedule.activityStartDate
    ? DateTime.fromISO(schedule.activityStartDate, { zone: timezone })
    : DateTime.fromISO(schedule.createdAt, { zone: timezone });
  const anchorWeekStart = anchorSource.startOf("week");

  const { hour: sh, minute: sm } = parseHms(schedule.startTime);
  const { hour: eh, minute: em } = parseHms(schedule.endTime);

  const occurrences: GeneratedOccurrence[] = [];

  while (cursor <= to) {
    let include = true;
    if (schedule.recurrence === "biweekly") {
      const weeksDiff = Math.round(cursor.startOf("week").diff(anchorWeekStart, "weeks").weeks);
      include = weeksDiff % 2 === 0;
    }

    if (include) {
      const startsAt = cursor.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
      const endsAt = cursor.set({ hour: eh, minute: em, second: 0, millisecond: 0 });

      occurrences.push({
        scheduleId: schedule.id,
        activityId: schedule.activityId,
        date: cursor.toISODate()!,
        startsAt: startsAt.toUTC().toISO()!,
        endsAt: endsAt.toUTC().toISO()!,
      });
    }

    cursor = cursor.plus({ weeks: 1 });
  }

  return occurrences;
}
