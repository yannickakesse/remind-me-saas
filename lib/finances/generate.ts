import { DateTime } from "luxon";

export type GenerableFrequency = "weekly" | "biweekly" | "monthly" | "one_time" | "per_project";

/**
 * Fréquences pour lesquelles une échéance de revenu peut être projetée.
 * - weekly, biweekly, monthly : récurrence temporelle
 * - one_time, per_project : échéance unique liée à la mission/contrat (date de fin, début ou création)
 */
const GENERABLE_FREQUENCIES: readonly string[] = [
  "weekly",
  "biweekly",
  "monthly",
  "one_time",
  "per_project",
];

export function isGenerableFrequency(frequency: string): frequency is GenerableFrequency {
  return GENERABLE_FREQUENCIES.includes(frequency);
}

export interface CompensationForGeneration {
  id: string;
  activityId: string;
  activityName: string;
  frequency: GenerableFrequency;
  amount: number;
  currency: string;
  /** Jour du mois (1-31) pour la fréquence "monthly". Null → dernier jour du mois. */
  paymentDay: number | null;
  /** Ancre de récurrence : date de début de l'activité, sinon date de création de la rémunération. */
  anchorDateISO: string;
  /** Date de début optionnelle de validité de l'activité */
  startDateISO?: string | null;
  /** Date d'échéance ou fin de l'activité/contrat */
  endDateISO?: string | null;
}

export interface GeneratedIncomeOccurrence {
  compensationId: string;
  activityId: string;
  label: string;
  amount: number;
  currency: string;
  dueDate: string; // ISO yyyy-MM-dd
}

/**
 * Calcule les échéances de revenu tombant dans [rangeStart, rangeEnd]
 * (bornes incluses, dates ISO) pour une rémunération donnée, en respectant
 * scrupuleusement la période de validité [startDate, endDate] de l'activité.
 */
export function generateIncomeOccurrences(
  compensation: CompensationForGeneration,
  rangeStartISO: string,
  rangeEndISO: string
): GeneratedIncomeOccurrence[] {
  const rangeStart = DateTime.fromISO(rangeStartISO).startOf("day");
  const rangeEnd = DateTime.fromISO(rangeEndISO).endOf("day");
  if (rangeStart > rangeEnd) return [];

  const activityStart = compensation.startDateISO
    ? DateTime.fromISO(compensation.startDateISO).startOf("day")
    : null;
  const activityEnd = compensation.endDateISO
    ? DateTime.fromISO(compensation.endDateISO).endOf("day")
    : null;

  const occurrences: GeneratedIncomeOccurrence[] = [];

  const makeLabel = (dueDate: DateTime) =>
    `${compensation.activityName} — ${dueDate.setLocale("fr").toFormat("MMMM yyyy")}`;

  // 1. Fréquences ponctuelles ou au projet (one_time, per_project)
  if (compensation.frequency === "one_time" || compensation.frequency === "per_project") {
    const rawTargetDate = compensation.endDateISO || compensation.startDateISO || compensation.anchorDateISO;
    const targetDate = DateTime.fromISO(rawTargetDate).startOf("day");
    if (targetDate >= rangeStart && targetDate <= rangeEnd) {
      occurrences.push({
        compensationId: compensation.id,
        activityId: compensation.activityId,
        label: `${compensation.activityName} — ${compensation.frequency === "per_project" ? "Projet" : "Prestation"}`,
        amount: compensation.amount,
        currency: compensation.currency,
        dueDate: targetDate.toISODate()!,
      });
    }
    return occurrences;
  }

  // 2. Fréquence mensuelle
  if (compensation.frequency === "monthly") {
    let cursor = rangeStart.startOf("month");
    while (cursor <= rangeEnd) {
      const daysInMonth = cursor.daysInMonth ?? 28;
      const day = Math.min(compensation.paymentDay ?? daysInMonth, daysInMonth);
      const dueDate = cursor.set({ day });

      const isAfterStart = !activityStart || dueDate >= activityStart.startOf("month");
      const isBeforeEnd = !activityEnd || dueDate <= activityEnd.endOf("month");

      if (dueDate >= rangeStart && dueDate <= rangeEnd && isAfterStart && isBeforeEnd) {
        occurrences.push({
          compensationId: compensation.id,
          activityId: compensation.activityId,
          label: makeLabel(dueDate),
          amount: compensation.amount,
          currency: compensation.currency,
          dueDate: dueDate.toISODate()!,
        });
      }
      cursor = cursor.plus({ months: 1 });
    }
    return occurrences;
  }

  // 3. Fréquences hebdomadaires (weekly / biweekly)
  const stepDays = compensation.frequency === "weekly" ? 7 : 14;
  const anchor = DateTime.fromISO(compensation.anchorDateISO).startOf("day");

  const diffDays = Math.floor(rangeStart.diff(anchor, "days").days);
  const stepsToSkip = diffDays > 0 ? Math.floor(diffDays / stepDays) : 0;
  let cursor = anchor.plus({ days: stepsToSkip * stepDays });
  while (cursor < rangeStart) cursor = cursor.plus({ days: stepDays });

  while (cursor <= rangeEnd) {
    const isAfterStart = !activityStart || cursor >= activityStart;
    const isBeforeEnd = !activityEnd || cursor <= activityEnd;

    if (isAfterStart && isBeforeEnd) {
      occurrences.push({
        compensationId: compensation.id,
        activityId: compensation.activityId,
        label: makeLabel(cursor),
        amount: compensation.amount,
        currency: compensation.currency,
        dueDate: cursor.toISODate()!,
      });
    }
    cursor = cursor.plus({ days: stepDays });
  }

  return occurrences;
}
