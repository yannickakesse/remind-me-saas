import { SupabaseClient } from "@supabase/supabase-js";
import { WEEKDAYS } from "@/lib/validation/activities";

export interface ScheduleCandidate {
  weekday: number;
  startTime: string; // Format "HH:mm"
  endTime: string;   // Format "HH:mm"
}

export function getWeekdayLabel(day: number): string {
  const found = WEEKDAYS.find((w) => w.value === day);
  return found ? found.label : `Jour ${day}`;
}

/**
 * Normalise l'heure au format standard "HH:mm" (24h)
 */
export function normalizeTime(time: string): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/**
 * Détermine si deux plages horaires se chevauchent sur la même journée.
 * Ex: 09:00-12:00 et 12:00-14:00 ne se chevauchent PAS.
 * Ex: 09:00-12:00 et 11:30-13:00 se chevauchent.
 */
export function doTimeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const normStartA = normalizeTime(startA);
  const normEndA = normalizeTime(endA);
  const normStartB = normalizeTime(startB);
  const normEndB = normalizeTime(endB);

  return normStartA < normEndB && normStartB < normEndA;
}

/**
 * Valide l'absence de conflit d'horaires :
 * 1. Au sein des créneaux soumis eux-mêmes.
 * 2. Avec les plannings des autres activités actives de l'utilisateur.
 *
 * Lance une exception explicite si un chevauchement est détecté.
 */
export async function assertNoScheduleConflicts({
  supabase,
  userId,
  schedules,
  excludeActivityId,
}: {
  supabase: SupabaseClient<any, "public", any>;
  userId: string;
  schedules: ScheduleCandidate[];
  excludeActivityId?: string;
}): Promise<void> {
  if (!schedules || schedules.length === 0) {
    return;
  }

  // 1. Vérification interne : chevauchements dans la liste soumise
  for (let i = 0; i < schedules.length; i++) {
    const s1 = schedules[i]!;
    for (let j = i + 1; j < schedules.length; j++) {
      const s2 = schedules[j]!;
      if (s1.weekday === s2.weekday) {
        if (doTimeRangesOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
          const day = getWeekdayLabel(s1.weekday);
          throw new Error(
            `Conflit d'horaires : Vous avez saisi deux créneaux qui se chevauchent le ${day} (${s1.startTime} - ${s1.endTime} et ${s2.startTime} - ${s2.endTime}).`
          );
        }
      }
    }
  }

  // 2. Vérification croisée : chevauchements avec d'autres activités actives
  const { data: existingRows, error } = await supabase
    .from("activity_schedules")
    .select(`
      id,
      activity_id,
      weekday,
      start_time,
      end_time,
      variable_hours,
      activity:activities (
        id,
        name,
        status
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Erreur lors de la vérification des conflits de planning :", error);
    // Si la table n'est pas accessible, on ne bloque pas silencieusement mais on logue
    return;
  }

  if (!existingRows || existingRows.length === 0) {
    return;
  }

  // Filtrer les créneaux à ignorer
  const activeExisting = existingRows.filter((row: any) => {
    // Ignorer les créneaux de l'activité en cours de modification
    if (excludeActivityId && row.activity_id === excludeActivityId) {
      return false;
    }
    const act = Array.isArray(row.activity) ? row.activity[0] : row.activity;
    // Ignorer les activités archivées ou sans horaires fixes
    if (act?.status === "archived" || row.variable_hours) {
      return false;
    }
    return true;
  });

  // Comparer chaque créneau soumis avec les créneaux existants
  for (const candidate of schedules) {
    for (const existing of activeExisting) {
      if (existing.weekday === candidate.weekday) {
        if (
          doTimeRangesOverlap(
            candidate.startTime,
            candidate.endTime,
            existing.start_time,
            existing.end_time
          )
        ) {
          const day = getWeekdayLabel(candidate.weekday);
          const act = Array.isArray(existing.activity)
            ? existing.activity[0]
            : existing.activity;
          const activityName = act?.name || "une autre activité";
          const eStart = normalizeTime(existing.start_time);
          const eEnd = normalizeTime(existing.end_time);

          throw new Error(
            `Conflit de planning : Le créneau du ${day} (${candidate.startTime} - ${candidate.endTime}) chevauche votre activité "${activityName}" (${eStart} - ${eEnd}). Veuillez ajuster vos horaires.`
          );
        }
      }
    }
  }
}
