import { msg } from "@/lib/i18n/catalog";

/**
 * Module « Mes Objectifs » — types, libellés et calcul de progression (fonctions pures, testables).
 * Distinct des objectifs d'épargne du module Finances.
 */

export const GOAL_DOMAINS = [
  { value: "personal", label: msg("Personnel"), emoji: "🌱" },
  { value: "professional", label: msg("Professionnel"), emoji: "💼" },
  { value: "studies", label: msg("Études"), emoji: "🎓" },
  { value: "finance", label: msg("Finances"), emoji: "💰" },
  { value: "health_sport", label: msg("Santé & sport"), emoji: "💪" },
  { value: "learning", label: msg("Apprentissage"), emoji: "📚" },
  { value: "project", label: msg("Projet"), emoji: "🚀" },
  { value: "other", label: msg("Autre"), emoji: "✨" },
] as const;
export type GoalDomain = (typeof GOAL_DOMAINS)[number]["value"];

export const GOAL_STATUSES = [
  { value: "active", label: msg("En cours") },
  { value: "paused", label: msg("En pause") },
  { value: "completed", label: msg("Terminé") },
  { value: "abandoned", label: msg("Abandonné") },
  { value: "archived", label: msg("Archivé") },
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number]["value"];

export const STEP_PERIODS = [
  { value: "daily", label: msg("Quotidienne") },
  { value: "weekly", label: msg("Hebdomadaire") },
  { value: "monthly", label: msg("Mensuelle") },
  { value: "custom", label: msg("Personnalisée") },
  { value: "milestone", label: msg("Jalon") },
] as const;
export type StepPeriod = (typeof STEP_PERIODS)[number]["value"];

export type StepStatus = "todo" | "in_progress" | "done" | "skipped";
export type GoalKind = "quantitative" | "qualitative";

export interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  domain: GoalDomain;
  motivation: string | null;
  start_date: string;
  due_date: string | null;
  kind: GoalKind;
  expected_result: string | null;
  unit: string | null;
  start_value: number;
  target_value: number | null;
  current_value: number;
  status: GoalStatus;
  completed_at: string | null;
  color: string | null;
  last_progress_at: string | null;
  created_at: string;
  savings_goal_id?: string | null;
  reminder_frequency?: string | null;
  reminder_time?: string | null;
  reminder_weekday?: number | null;
}

export interface StepRow {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  period: StepPeriod;
  start_date: string | null;
  due_date: string | null;
  target_value: number | null;
  weight: number;
  position: number;
  status: StepStatus;
  completed_at: string | null;
  linked_task_id: string | null;
}

export type ProgressPace = "ahead" | "on_track" | "behind" | "unknown";

export interface GoalProgress {
  /** Pourcentage 0-100, ou null si rien ne permet de le calculer (objectif qualitatif sans étape). */
  percent: number | null;
  method: "value" | "steps" | "none";
  stepsDone: number;
  stepsTotal: number;
  stepsRemaining: number;
  overdueSteps: number;
  /** Jours restants avant la date limite (négatif si dépassée), null sans date limite. */
  daysLeft: number | null;
  /** Avancement attendu à aujourd'hui si la progression était régulière (0-100), null sans date limite. */
  expectedPercent: number | null;
  pace: ProgressPace;
  /** Date limite dépassée sans que l'objectif soit terminé. */
  overdue: boolean;
}

const DAY = 86_400_000;
const dayMs = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Calcule la progression d'un objectif.
 * - Quantitatif : position de la valeur actuelle entre la valeur de départ et la cible
 *   (fonctionne aussi pour une cible plus basse que le départ, ex. un poids à perdre).
 * - Qualitatif : part pondérée des étapes terminées (les étapes ignorées ne comptent pas).
 * - Rythme : comparé à une progression régulière entre la date de début et la date limite.
 *   Jamais de conclusion sans date limite ou sans progression mesurable (« unknown »).
 * @param today date du jour de l'utilisateur, « AAAA-MM-JJ » (son fuseau horaire)
 */
export function computeGoalProgress(goal: GoalRow, steps: StepRow[], today: string): GoalProgress {
  const counted = steps.filter((s) => s.status !== "skipped");
  const done = counted.filter((s) => s.status === "done");
  const stepsDone = done.length;
  const stepsTotal = counted.length;
  const overdueSteps = counted.filter((s) => s.status !== "done" && s.due_date && s.due_date < today).length;

  let percent: number | null = null;
  let method: GoalProgress["method"] = "none";

  if (goal.status === "completed") {
    percent = 100;
    method = goal.kind === "quantitative" ? "value" : stepsTotal > 0 ? "steps" : "none";
  } else if (goal.kind === "quantitative" && goal.target_value !== null && goal.target_value !== goal.start_value) {
    percent = clamp(((Number(goal.current_value) - Number(goal.start_value)) / (Number(goal.target_value) - Number(goal.start_value))) * 100);
    method = "value";
  } else if (stepsTotal > 0) {
    const totalWeight = counted.reduce((a, s) => a + Number(s.weight || 1), 0);
    const doneWeight = done.reduce((a, s) => a + Number(s.weight || 1), 0);
    percent = clamp((doneWeight / totalWeight) * 100);
    method = "steps";
  }
  if (percent !== null) percent = Math.round(percent * 10) / 10;

  let daysLeft: number | null = null;
  let expectedPercent: number | null = null;
  if (goal.due_date) {
    daysLeft = Math.round((dayMs(goal.due_date) - dayMs(today)) / DAY);
    const span = dayMs(goal.due_date) - dayMs(goal.start_date);
    if (span > 0) expectedPercent = Math.round(clamp(((dayMs(today) - dayMs(goal.start_date)) / span) * 100));
    else expectedPercent = dayMs(today) >= dayMs(goal.due_date) ? 100 : 0;
  }

  const finished = goal.status === "completed";
  const overdue = !finished && daysLeft !== null && daysLeft < 0;

  let pace: ProgressPace = "unknown";
  if (finished) pace = "on_track";
  else if (percent !== null && expectedPercent !== null && goal.status === "active") {
    // Marge de 10 points pour ne pas alarmer pour un léger décalage
    if (percent < expectedPercent - 10) pace = "behind";
    else if (percent > expectedPercent + 10) pace = "ahead";
    else pace = "on_track";
  }

  return {
    percent,
    method,
    stepsDone,
    stepsTotal,
    stepsRemaining: stepsTotal - stepsDone,
    overdueSteps,
    daysLeft,
    expectedPercent,
    pace,
    overdue,
  };
}

/** Paliers franchis entre deux pourcentages (25, 50, 75, 100) — pour les félicitations. */
export function crossedMilestones(before: number | null, after: number | null): number[] {
  if (after === null) return [];
  const from = before ?? 0;
  return [25, 50, 75, 100].filter((m) => from < m && after >= m);
}
