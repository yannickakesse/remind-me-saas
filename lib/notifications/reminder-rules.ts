/**
 * Règles de rappel pures (aucun accès à la base) : testées par scripts/test-reminders-step1.ts.
 * Utilisées par le moteur (serveur) et, pour les heures silencieuses, par l'application (client).
 */
import { DateTime } from "luxon";

/** Délais par défaut avant une séance, si l'utilisateur ne les a pas réglés. */
export const DEFAULT_FIRST_LEAD_MINUTES = 30;
export const DEFAULT_SECOND_LEAD_MINUTES = 10;

/** Fenêtre de rattrapage : au-delà, un rappel « N min avant » n'a plus de sens (on passe au suivant). */
export const LEAD_LATE_TOLERANCE_MINUTES = 10;

/**
 * L'heure actuelle (dans le fuseau de l'utilisateur) est-elle dans ses heures silencieuses ?
 * Gère les plages qui traversent minuit (22:00 → 07:00).
 */
export function isInQuietHours(now: DateTime, enabled: boolean, startStr = "22:00", endStr = "07:00"): boolean {
  if (!enabled) return false;
  const currentMinutes = now.hour * 60 + now.minute;
  const [startH, startM] = (startStr || "22:00").split(":").map(Number);
  const [endH, endM] = (endStr || "07:00").split(":").map(Number);
  const startMinutes = (Number.isFinite(startH) ? startH! : 22) * 60 + (startM || 0);
  const endMinutes = (Number.isFinite(endH) ? endH! : 7) * 60 + (endM || 0);
  if (startMinutes === endMinutes) return false;
  if (startMinutes > endMinutes) return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Clé anti-doublon d'un rappel de séance lié à son HEURE de début (et pas seulement à sa date) :
 * si l'heure change le même jour, un nouveau rappel peut partir ; s'il ne change pas, jamais deux fois.
 */
export function activitySlotKey(eventId: string, suffix: string, eventStart: DateTime): string {
  return `activity:${eventId}:${suffix}_${eventStart.toFormat("yyyy-MM-dd'T'HHmm")}`;
}

/** Ancienne clé (date seule), vérifiée aussi pour ne pas renvoyer un rappel déjà parti avant la mise à jour. */
export function legacyActivitySlotKey(eventId: string, suffix: string, eventStart: DateTime): string {
  return `activity:${eventId}:${suffix}_${eventStart.toISODate()}`;
}

/**
 * Rappel « échéance proche » d'une tâche : respecte le délai choisi pour la tâche.
 * - Délai choisi (> 0) et heure d'échéance connue : le rappel part au plus tôt N minutes avant.
 * - Sinon : comportement habituel (dans les 2 heures qui précèdent l'échéance).
 * Jamais plus de 15 minutes après l'échéance (au-delà, c'est le rappel « en retard » qui prend le relais).
 */
export function isTaskDueSoon(minutesUntil: number, reminderMinutes: number | null | undefined, hasDueTime: boolean): boolean {
  if (minutesUntil < -15) return false;
  const lead = hasDueTime && typeof reminderMinutes === "number" && reminderMinutes > 0 ? reminderMinutes : 120;
  return minutesUntil <= lead;
}

/**
 * Pendant les heures silencieuses, seuls les rappels critiques (ex. séance qui commence dans 10 minutes,
 * que l'utilisateur a lui-même programmée la nuit) sont envoyés tout de suite ; les autres sont reportés.
 */
export function shouldDeferPush(quietHoursActive: boolean, priority: string): boolean {
  return quietHoursActive && priority !== "critical";
}

/** Rappels qui perdent leur sens une fois l'heure passée (inutile de les envoyer au réveil). */
const TIME_BOUND_KINDS = /^(activity_reminder_|task_due_soon$)/;

/**
 * Un push reporté (heures silencieuses) doit-il encore être envoyé à la fin de la plage ?
 * - Jamais pour un rappel « dans N minutes » dont l'heure est passée.
 * - Jamais au-delà de 14 heures (une nuit) : il reste visible dans le centre de notifications.
 */
export function isDeferredPushStillRelevant(
  n: { kind: string; created_at: string; metadata?: Record<string, any> | null },
  now: DateTime
): boolean {
  const created = DateTime.fromISO(n.created_at);
  if (!created.isValid || now.diff(created, "hours").hours > 14) return false;
  if (TIME_BOUND_KINDS.test(n.kind)) {
    const startsAt = n.metadata?.starts_at ? DateTime.fromISO(n.metadata.starts_at) : null;
    if (!startsAt || !startsAt.isValid || startsAt <= now) return false;
  }
  return true;
}

/**
 * Étiquette système d'une notification : une par rappel (deux rappels proches ne s'écrasent plus),
 * mais le même rappel relancé remplace sa version précédente au lieu de s'empiler.
 */
export function pushTagFor(idempotencyKey: string | null | undefined, fallback: string): string {
  return (idempotencyKey || fallback || "remindme-alert").replace(/^push:/, "").slice(0, 120);
}

/**
 * Délais des rappels d'une séance.
 * - Délai propre à l'activité (s'il est réglé), sinon le délai général des paramètres.
 * - Si ce délai est trop proche du second rappel (ex. 15 min avec un second rappel à 10 min),
 *   un seul rappel part, au délai choisi : jamais deux rappels presque simultanés.
 * `first = 0` signifie « pas de premier rappel distinct ».
 */
export function resolveActivityLeads(
  activityLead: number | null | undefined,
  globalFirst: number | null | undefined,
  globalSecond: number | null | undefined
): { first: number; second: number } {
  const second = typeof globalSecond === "number" && globalSecond > 0 ? globalSecond : DEFAULT_SECOND_LEAD_MINUTES;
  const first =
    typeof activityLead === "number" && activityLead > 0
      ? activityLead
      : typeof globalFirst === "number" && globalFirst > 0
      ? globalFirst
      : DEFAULT_FIRST_LEAD_MINUTES;
  if (first <= second + 5) return { first: 0, second: first };
  return { first, second };
}
