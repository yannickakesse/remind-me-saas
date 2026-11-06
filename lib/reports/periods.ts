/**
 * Périodes de statistiques : couverture des données, période précédente, comparaison,
 * heures réellement travaillées et échéances programmées à venir.
 *
 * Fonctions pures (aucun accès à la base) : testées par scripts/test-reports-lot-a.ts.
 * Règle majeure : ne jamais confondre « aucune donnée » et « résultat nul ».
 */
import { DateTime } from "luxon";

/**
 * - none     : aucune donnée pour cette période (avant le début du suivi) → aucun chiffre affiché
 * - zero     : période entièrement suivie, sans aucune opération → de vrais zéros
 * - partial  : période en cours, ou qui commence avant le début du suivi
 * - complete : période terminée, entièrement suivie, avec des opérations
 */
export type PeriodCoverage = "none" | "zero" | "partial" | "complete";

export type PeriodGranularity = "month" | "quarter" | "year" | "custom";

/**
 * Début du suivi = la date la plus ancienne entre la création du compte et la première opération saisie.
 * Une opération d'octobre saisie en novembre fait donc entrer octobre dans les statistiques.
 */
export function trackingStartDate(
  accountCreatedDate: string | null | undefined,
  earliestOperationDate: string | null | undefined
): string | null {
  const dates = [accountCreatedDate, earliestOperationDate].filter((d): d is string => !!d).map((d) => d.slice(0, 10));
  if (dates.length === 0) return null;
  return dates.sort()[0] ?? null;
}

export function periodCoverage(params: {
  start: string;
  end: string;
  today: string;
  trackingStart: string | null;
  operationCount: number;
}): PeriodCoverage {
  const { start, end, today, trackingStart, operationCount } = params;
  // Une opération réellement datée dans la période suffit à la rendre « suivie »
  if (!trackingStart || (end < trackingStart && operationCount === 0)) return "none";
  if (start > today) return operationCount > 0 ? "partial" : "none"; // période future
  if (end >= today || start < trackingStart) return "partial";
  return operationCount > 0 ? "complete" : "zero";
}

/** Une comparaison n'est proposée que si les deux périodes ont des données (ou de vrais zéros). */
export function canCompare(current: PeriodCoverage, previous: PeriodCoverage): boolean {
  return current !== "none" && previous !== "none";
}

/** Comparaison indicative : l'une des deux périodes est incomplète. */
export function isIndicativeComparison(current: PeriodCoverage, previous: PeriodCoverage): boolean {
  return current === "partial" || previous === "partial";
}

/** Reconnaît la granularité d'une plage : mois, trimestre ou année civils, sinon personnalisée. */
export function detectGranularity(start: string, end: string): PeriodGranularity {
  const s = DateTime.fromISO(start);
  const e = DateTime.fromISO(end);
  if (!s.isValid || !e.isValid) return "custom";
  const iso = (d: DateTime) => d.toISODate();
  if (iso(s) === iso(s.startOf("month")) && iso(e) === iso(s.endOf("month"))) return "month";
  if (iso(s) === iso(s.startOf("quarter")) && iso(e) === iso(s.endOf("quarter"))) return "quarter";
  if (iso(s) === iso(s.startOf("year")) && iso(e) === iso(s.endOf("year"))) return "year";
  return "custom";
}

/** Période précédente de même nature : mois, trimestre ou année d'avant ; sinon même durée juste avant. */
export function previousPeriod(start: string, end: string): { start: string; end: string; granularity: PeriodGranularity } {
  const granularity = detectGranularity(start, end);
  const s = DateTime.fromISO(start);
  if (granularity === "month" || granularity === "quarter" || granularity === "year") {
    const unit = granularity;
    const p = s.minus({ [`${unit}s`]: 1 } as any);
    return { start: p.startOf(unit).toISODate()!, end: p.endOf(unit).toISODate()!, granularity };
  }
  const days = Math.round(DateTime.fromISO(end).diff(s, "days").days) + 1;
  return {
    start: s.minus({ days }).toISODate()!,
    end: s.minus({ days: 1 }).toISODate()!,
    granularity,
  };
}

export interface ValueDelta {
  current: number;
  previous: number;
  /** Écart en valeur absolue. */
  delta: number;
  /** Écart en % ; null si la base est nulle (jamais de % sur une base à zéro). */
  percent: number | null;
}

export function compareValue(current: number, previous: number): ValueDelta {
  const delta = current - previous;
  const percent = previous === 0 ? null : Math.round((delta / Math.abs(previous)) * 1000) / 10;
  return { current, previous, delta, percent };
}

// ---------------------------------------------------------------------------
// Heures réellement travaillées
// ---------------------------------------------------------------------------

export interface SessionRow {
  activity_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string | null;
}

/**
 * Heures travaillées sur la période [start, end] (dates locales du fuseau de l'utilisateur).
 * - Annulée, manquée, reportée : jamais comptée.
 * - Planifiée ou en cours : comptée seulement pour la partie déjà écoulée (jamais d'heures futures).
 * - Une séance qui déborde de la période n'est comptée que pour sa partie incluse.
 */
export function workedHoursByActivity(
  sessions: SessionRow[],
  start: string,
  end: string,
  timezone: string,
  now: DateTime = DateTime.now()
): { byActivity: Map<string, number>; total: number } {
  const periodStart = DateTime.fromISO(start, { zone: timezone }).startOf("day");
  const periodEnd = DateTime.fromISO(end, { zone: timezone }).endOf("day");
  const byActivity = new Map<string, number>();
  let total = 0;
  for (const s of sessions) {
    if (!s.starts_at || !s.ends_at) continue;
    if (s.status === "cancelled" || s.status === "missed" || s.status === "postponed") continue;
    const sStart = DateTime.fromISO(s.starts_at);
    let sEnd: DateTime = DateTime.fromISO(s.ends_at);
    if (s.status !== "completed" && sEnd > now) sEnd = now; // pas d'heures futures
    const from = sStart > periodStart ? sStart : periodStart;
    const to = sEnd < periodEnd ? sEnd : periodEnd;
    const hours = to.diff(from, "hours").hours;
    if (!(hours > 0)) continue;
    const key = s.activity_id ?? "unassigned";
    byActivity.set(key, (byActivity.get(key) ?? 0) + hours);
    total += hours;
  }
  return { byActivity, total };
}

// ---------------------------------------------------------------------------
// Dépenses programmées à venir (échéancier) non encore enregistrées
// ---------------------------------------------------------------------------

export interface ScheduledExpenseRow {
  name: string;
  amount: number | string;
  currency: string;
  frequency: string;
  next_due_date: string;
  end_date: string | null;
  status: string;
  category?: string | null;
  activity_id?: string | null;
}

const STEP: Record<string, Record<string, number> | null> = {
  once: null,
  daily: { days: 1 },
  weekly: { weeks: 1 },
  monthly: { months: 1 },
  quarterly: { months: 3 },
  yearly: { years: 1 },
};

/**
 * Échéances programmées tombant dans [start, end], à partir de la prochaine échéance.
 * Une échéance déjà présente dans les dépenses (même libellé, date et montant) n'est pas recomptée.
 */
export function upcomingScheduledOccurrences(
  scheduled: ScheduledExpenseRow[],
  start: string,
  end: string,
  existingExpenses: Array<{ label: string; due_date: string; amount: number | string }>
): Array<{ name: string; date: string; amount: number; currency: string; category: string | null; activity_id: string | null }> {
  const existing = new Set(existingExpenses.map((e) => `${e.label}::${e.due_date}::${Number(e.amount)}`));
  const out: Array<{ name: string; date: string; amount: number; currency: string; category: string | null; activity_id: string | null }> = [];
  for (const s of scheduled) {
    if (s.status !== "planned" && s.status !== "due") continue;
    const step = STEP[s.frequency];
    let d = DateTime.fromISO(s.next_due_date);
    if (!d.isValid) continue;
    for (let guard = 0; guard < 400; guard++) {
      const iso = d.toISODate()!;
      if (iso > end || (s.end_date && iso > s.end_date)) break;
      if (iso >= start && !existing.has(`${s.name}::${iso}::${Number(s.amount)}`)) {
        out.push({ name: s.name, date: iso, amount: Number(s.amount), currency: s.currency, category: s.category ?? null, activity_id: s.activity_id ?? null });
      }
      if (!step) break;
      d = d.plus(step);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Dépenses récurrentes / ponctuelles
// ---------------------------------------------------------------------------

/**
 * Une dépense payée depuis l'échéancier porte la note « Issu d'une dépense programmée ».
 * Il n'existe pas de lien en base : la distinction est donc une estimation pour les anciennes lignes.
 */
export function isRecurringExpense(notes: string | null | undefined): boolean {
  return !!notes && /^Issu (d.une|de la) dépense programmée/i.test(notes.trim());
}
