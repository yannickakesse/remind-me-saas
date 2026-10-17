import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, EngagementNature } from "@/types/database";

export interface WeeklyRealization {
  weekIndex: number; // 1 à 4
  startDate: string; // ISO yyyy-MM-dd
  endDate: string; // ISO yyyy-MM-dd
  completedCount: number;
  missedCount: number;
  cancelledCount: number;
  postponedCount: number;
  totalEvaluated: number;
  completionRate: number; // 0 à 100
}

export interface ActivityEvolutionEligibility {
  isEligible: boolean;
  activityId: string;
  activityName: string;
  currentNature: EngagementNature;
  suggestedNature: "routine";
  daysOld: number;
  totalCompleted: number;
  totalEvaluated: number;
  overallRate: number; // 0 à 100
  weeklyBreakdown: WeeklyRealization[];
  reasons: string[];
}

export interface EvolutionSuggestionPayload {
  title: string;
  body: string;
  metadata: Record<string, any>;
}

/**
 * Fonction pure et testable vérifiant l'éligibilité d'une activité pour évoluer vers une 'routine'.
 * 
 * Critères stricts :
 * 1. Activité active et engagement_nature !== 'routine'.
 * 2. Ancienneté d'au moins 30 jours (start_date ou created_at).
 * 3. 4 semaines consécutives analysées (28 jours écoulés).
 * 4. Taux de réalisation d'au moins 80% sur 4 semaines consécutives.
 * 5. Au moins 8 séances explicitement enregistrées avec le statut 'completed'.
 * 6. Les séances 'missed', 'cancelled' et 'postponed' ne comptent jamais comme terminées.
 * 7. Aucune invention de données : les séances réelles de la base sont strictement requises.
 */
export function checkRoutineEvolutionEligibility(
  activity: {
    id: string;
    name: string;
    status: string;
    engagement_nature?: string | null;
    created_at: string;
    start_date?: string | null;
  },
  calendarEvents: Array<{
    id: string;
    activity_id: string | null;
    starts_at: string;
    status: string;
  }>,
  now: DateTime = DateTime.now(),
  timezone: string = "UTC"
): ActivityEvolutionEligibility {
  const reasons: string[] = [];
  const currentNature = (activity.engagement_nature as EngagementNature) || "temporary_engagement";

  // 1. Condition de statut : doit être active
  if (activity.status !== "active") {
    reasons.push("L'activité doit avoir le statut 'active' pour être éligible.");
  }

  // 2. Condition de nature : ne doit pas déjà être une routine
  if (activity.engagement_nature === "routine") {
    reasons.push("L'activité est déjà classée comme routine.");
  }

  // 3. Condition d'ancienneté : au moins 30 jours
  const anchorDateStr = activity.start_date || activity.created_at;
  const anchorDate = DateTime.fromISO(anchorDateStr, { zone: timezone }).startOf("day");
  const daysOld = Math.floor(now.startOf("day").diff(anchorDate, "days").days);

  if (daysOld < 30) {
    reasons.push(
      `L'activité a ${daysOld} jour(s) d'ancienneté (minimum 30 jours requis).`
    );
  }

  // 4. Analyse sur 4 semaines consécutives (28 jours précédant maintenant)
  const windowEnd = now;
  const windowStart = now.minus({ days: 28 }).startOf("day");

  const weeklyBreakdown: WeeklyRealization[] = [];
  let totalCompleted = 0;
  let totalEvaluated = 0;
  let hasIncompleteWeek = false;

  for (let i = 1; i <= 4; i++) {
    const wStart = windowStart.plus({ days: (i - 1) * 7 });
    const wEnd = i === 4 ? windowEnd : wStart.plus({ days: 7 }).minus({ milliseconds: 1 });

    let completedCount = 0;
    let missedCount = 0;
    let cancelledCount = 0;
    let postponedCount = 0;

    for (const ev of calendarEvents) {
      if (ev.activity_id !== activity.id) continue;

      const evStart = DateTime.fromISO(ev.starts_at, { zone: timezone });
      if (evStart < wStart || evStart > wEnd) continue;
      // Ne prendre en compte que les séances échues (passées ou présentes)
      if (evStart > now) continue;

      if (ev.status === "completed") {
        completedCount++;
      } else if (ev.status === "missed") {
        missedCount++;
      } else if (ev.status === "cancelled") {
        cancelledCount++;
      } else if (ev.status === "postponed") {
        postponedCount++;
      }
    }

    const weekEvaluated = completedCount + missedCount + cancelledCount + postponedCount;
    const weekRate = weekEvaluated > 0 ? (completedCount / weekEvaluated) * 100 : 0;

    weeklyBreakdown.push({
      weekIndex: i,
      startDate: wStart.toISODate()!,
      endDate: wEnd.toISODate()!,
      completedCount,
      missedCount,
      cancelledCount,
      postponedCount,
      totalEvaluated: weekEvaluated,
      completionRate: Math.round(weekRate * 10) / 10,
    });

    totalCompleted += completedCount;
    totalEvaluated += weekEvaluated;

    // Pour attester d'une pratique continue sur 4 semaines consécutives :
    // Chaque semaine doit comporter au moins 1 séance terminée (pas de semaine blanche)
    if (completedCount === 0) {
      hasIncompleteWeek = true;
    }
  }

  // 5. Condition de volume : au moins 8 séances explicitement completed
  if (totalCompleted < 8) {
    reasons.push(
      `${totalCompleted} séance(s) terminée(s) sur les 4 dernières semaines (minimum 8 séances 'completed' requis).`
    );
  }

  // 6. Condition de taux global sur les 4 semaines consécutives : >= 80%
  const overallRate = totalEvaluated > 0 ? (totalCompleted / totalEvaluated) * 100 : 0;
  if (overallRate < 80) {
    reasons.push(
      `Taux de réalisation global sur les 4 semaines consécutives de ${Math.round(overallRate)}% (minimum 80% requis).`
    );
  }

  if (hasIncompleteWeek) {
    reasons.push(
      "La pratique n'a pas été maintenue de façon continue sur chacune des 4 semaines consécutives (semaine sans séance terminée constatée)."
    );
  }

  const isEligible = reasons.length === 0;

  return {
    isEligible,
    activityId: activity.id,
    activityName: activity.name,
    currentNature,
    suggestedNature: "routine",
    daysOld,
    totalCompleted,
    totalEvaluated,
    overallRate: Math.round(overallRate * 10) / 10,
    weeklyBreakdown,
    reasons,
  };
}

/**
 * Génère le message et les métadonnées de proposition pour l'utilisateur.
 */
export function buildEvolutionSuggestionContent(
  eligibility: ActivityEvolutionEligibility
): EvolutionSuggestionPayload {
  const roundedRate = Math.round(eligibility.overallRate);
  return {
    title: `🎯 Suggestion d'évolution : ${eligibility.activityName}`,
    body: `Votre activité « ${eligibility.activityName} » a été réalisée avec succès (${eligibility.totalCompleted}/${eligibility.totalEvaluated} séances terminées, soit ${roundedRate}%) sur 4 semaines consécutives avec ${eligibility.daysOld} jours d'ancienneté. Souhaitez-vous la faire évoluer en routine ?`,
    metadata: {
      activityId: eligibility.activityId,
      activityName: eligibility.activityName,
      currentNature: eligibility.currentNature,
      suggestedNature: "routine",
      totalCompleted: eligibility.totalCompleted,
      totalEvaluated: eligibility.totalEvaluated,
      completionRate: eligibility.overallRate,
      daysOld: eligibility.daysOld,
      weeklyBreakdown: eligibility.weeklyBreakdown,
      can_accept: true,
      can_decline: true,
      is_evolution_suggestion: true,
    },
  };
}

/**
 * Moteur d'évaluation des suggestions d'évolution.
 * Vérifie toutes les activités éligibles pour l'utilisateur et génère
 * une proposition respectueuse si aucune suggestion n'est active ou en période de répit.
 */
export async function evaluateActivityEvolutionSuggestions(
  supabase: SupabaseClient<Database>,
  userId: string,
  now: DateTime = DateTime.now(),
  timezone: string = "UTC"
): Promise<{ evaluated: number; suggestionsCreated: number; eligibleActivities: ActivityEvolutionEligibility[] }> {
  // 1. Récupérer les activités actives non-routine
  const { data: userActivities } = await supabase
    .from("activities")
    .select("id, name, status, engagement_nature, validity_type, start_date, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .neq("engagement_nature", "routine");

  if (!userActivities || userActivities.length === 0) {
    return { evaluated: 0, suggestionsCreated: 0, eligibleActivities: [] };
  }

  // 2. Récupérer les événements de calendrier des 28 derniers jours
  const windowStartIso = now.minus({ days: 30 }).startOf("day").toUTC().toISO()!;
  const windowEndIso = now.endOf("day").toUTC().toISO()!;

  const { data: pastEvents } = await supabase
    .from("calendar_events")
    .select("id, activity_id, starts_at, status")
    .eq("user_id", userId)
    .gte("starts_at", windowStartIso)
    .lte("starts_at", windowEndIso);

  // 3. Récupérer l'historique des suggestions pour cet utilisateur
  const { data: existingSuggestions } = await supabase
    .from("notifications")
    .select("id, entity_id, status, snoozed_until, actioned_at, resolved_at, created_at")
    .eq("user_id", userId)
    .eq("kind", "activity_routine_suggestion");

  const existingMap = new Map<string, Array<{
    id: string;
    status: string;
    snoozed_until?: string | null;
    actioned_at?: string | null;
    resolved_at?: string | null;
    created_at: string;
  }>>();

  for (const s of existingSuggestions ?? []) {
    if (!s.entity_id) continue;
    const list = existingMap.get(s.entity_id) ?? [];
    list.push(s);
    existingMap.set(s.entity_id, list);
  }

  let suggestionsCreated = 0;
  const eligibleActivities: ActivityEvolutionEligibility[] = [];

  for (const act of userActivities) {
    const eligibility = checkRoutineEvolutionEligibility(act, pastEvents ?? [], now, timezone);
    if (!eligibility.isEligible) continue;

    eligibleActivities.push(eligibility);

    const pastNotifs = existingMap.get(act.id) ?? [];

    // Vérifier si une suggestion active ou un refus récent bloque la réémission
    let shouldSkip = false;
    for (const notif of pastNotifs) {
      // 1. Suggestion en cours non traitée -> ne pas dupliquer
      if (notif.status === "unread" || notif.status === "read") {
        shouldSkip = true;
        break;
      }

      // 2. Déjà acceptée -> l'activité va basculer en routine, ne pas réémettre
      if (notif.status === "actioned") {
        shouldSkip = true;
        break;
      }

      // 3. Refusée ou en répit (cooldown) : respecter le choix sans harceler l'utilisateur (délai de 30 jours)
      if (notif.status === "dismissed" || notif.status === "snoozed" || notif.snoozed_until) {
        const snoozeDT = notif.snoozed_until
          ? DateTime.fromISO(notif.snoozed_until)
          : DateTime.fromISO(notif.actioned_at || notif.resolved_at || notif.created_at).plus({ days: 30 });

        if (snoozeDT > now) {
          shouldSkip = true;
          break;
        }
      }
    }

    if (shouldSkip) continue;

    // Créer la nouvelle suggestion
    const content = buildEvolutionSuggestionContent(eligibility);
    const cycleKey = now.toFormat("yyyy-MM");

    const { error: insertErr } = await supabase.from("notifications").insert({
      user_id: userId,
      category: "activity",
      kind: "activity_routine_suggestion",
      priority: "normal",
      status: "unread",
      entity_type: "activity",
      entity_id: act.id,
      title: content.title,
      body: content.body,
      metadata: content.metadata,
      link: "/activities",
      scheduled_at: now.toISO()!,
      idempotency_key: `activity:${act.id}:routine_suggestion:${cycleKey}`,
    });

    if (!insertErr) {
      suggestionsCreated++;
    }
  }

  return {
    evaluated: userActivities.length,
    suggestionsCreated,
    eligibleActivities,
  };
}
