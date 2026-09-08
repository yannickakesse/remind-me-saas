import { DateTime } from "luxon";

export type GenerableFrequency = "weekly" | "biweekly" | "monthly";

/**
 * Fréquences pour lesquelles une échéance peut être calculée à l'avance à
 * partir du seul calendrier (jour du mois ou cadence hebdomadaire). Les
 * fréquences horaire/journalière/par séance/par projet/ponctuelle dépendent
 * du travail effectivement réalisé (heures, séances...) : les générer à
 * l'avance reviendrait à inventer un montant "prévu" non fondé, ce qui
 * contredirait justement le principe de ne pas mélanger prévu et réel. Ces
 * revenus-là restent en saisie manuelle, une fois le travail réalisé connu.
 */
const GENERABLE_FREQUENCIES: readonly string[] = ["weekly", "biweekly", "monthly"];

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
  /** Ancre de récurrence hebdomadaire/bihebdomadaire : date de début de l'activité, sinon date de création de la rémunération. */
  anchorDateISO: string;
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
 * (bornes incluses, dates ISO) pour une rémunération récurrente donnée.
 */
export function generateIncomeOccurrences(
  compensation: CompensationForGeneration,
  rangeStartISO: string,
  rangeEndISO: string
): GeneratedIncomeOccurrence[] {
  const rangeStart = DateTime.fromISO(rangeStartISO).startOf("day");
  const rangeEnd = DateTime.fromISO(rangeEndISO).endOf("day");
  if (rangeStart > rangeEnd) return [];

  const occurrences: GeneratedIncomeOccurrence[] = [];

  const makeLabel = (dueDate: DateTime) =>
    `${compensation.activityName} — ${dueDate.setLocale("fr").toFormat("MMMM yyyy")}`;

  if (compensation.frequency === "monthly") {
    let cursor = rangeStart.startOf("month");
    while (cursor <= rangeEnd) {
      const daysInMonth = cursor.daysInMonth ?? 28;
      const day = Math.min(compensation.paymentDay ?? daysInMonth, daysInMonth);
      const dueDate = cursor.set({ day });

      if (dueDate >= rangeStart && dueDate <= rangeEnd) {
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

  // weekly / biweekly : cadence fixe en jours à partir de l'ancre.
  const stepDays = compensation.frequency === "weekly" ? 7 : 14;
  const anchor = DateTime.fromISO(compensation.anchorDateISO).startOf("day");

  // Se positionne sur la première échéance à partir de l'ancre qui tombe à
  // ou après le début de la période demandée, sans reboucler occurrence par
  // occurrence depuis l'origine (potentiellement des années plus tôt).
  const diffDays = Math.floor(rangeStart.diff(anchor, "days").days);
  const stepsToSkip = diffDays > 0 ? Math.floor(diffDays / stepDays) : 0;
  let cursor = anchor.plus({ days: stepsToSkip * stepDays });
  while (cursor < rangeStart) cursor = cursor.plus({ days: stepDays });

  while (cursor <= rangeEnd) {
    occurrences.push({
      compensationId: compensation.id,
      activityId: compensation.activityId,
      label: makeLabel(cursor),
      amount: compensation.amount,
      currency: compensation.currency,
      dueDate: cursor.toISODate()!,
    });
    cursor = cursor.plus({ days: stepDays });
  }

  return occurrences;
}
