"use server";

import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getTr } from "@/lib/i18n/server";
import { checkPersonalGoalQuota } from "@/lib/subscriptions/server";
import { goalInputSchema, stepInputSchema, type GoalInput, type StepInput } from "@/lib/validation/goals";
import { computeGoalProgress, crossedMilestones, type GoalRow, type GoalStatus, type StepRow, type StepStatus } from "@/lib/goals/progress";

/**
 * Module « Mes Objectifs » — actions serveur.
 * Toutes les vérifications (propriétaire, quotas) sont faites ici, côté serveur.
 * Les erreurs sont renvoyées (et non levées) pour que le message reste lisible en production.
 */
export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expirée. Reconnectez-vous.");
  return { supabase, db: supabase as any, user };
}

function firstIssue(err: unknown, fallback: string): string {
  const issues = (err as any)?.issues;
  return Array.isArray(issues) && issues[0]?.message ? issues[0].message : fallback;
}

function refresh(goalId?: string) {
  revalidatePath("/goals");
  if (goalId) revalidatePath(`/goals/${goalId}`);
  revalidatePath("/dashboard");
}

async function todayFor(db: any, userId: string): Promise<string> {
  const { data } = await db.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  return DateTime.now().setZone(data?.timezone || "UTC").toISODate()!;
}

function goalColumns(g: ReturnType<typeof goalInputSchema.parse>) {
  return {
    title: g.title,
    description: g.description,
    domain: g.domain,
    motivation: g.motivation,
    start_date: g.startDate,
    due_date: g.dueDate,
    kind: g.kind,
    expected_result: g.expectedResult,
    unit: g.kind === "quantitative" ? g.unit : null,
    start_value: g.kind === "quantitative" ? g.startValue ?? 0 : 0,
    target_value: g.kind === "quantitative" ? g.targetValue : null,
    reminder_frequency: g.reminderFrequency,
    reminder_time: g.reminderTime,
    reminder_weekday: g.reminderWeekday,
    color: g.color,
    updated_at: new Date().toISOString(),
  };
}

function stepColumns(s: ReturnType<typeof stepInputSchema.parse>) {
  return {
    title: s.title,
    description: s.description,
    period: s.period,
    start_date: s.startDate,
    due_date: s.dueDate,
    target_value: s.targetValue,
    weight: s.weight && s.weight > 0 ? s.weight : 1,
    updated_at: new Date().toISOString(),
  };
}

/** Félicitations in-app quand un palier (25/50/75/100 %) est franchi — une seule fois par palier. */
async function celebrateMilestones(db: any, userId: string, goal: GoalRow, before: number | null, after: number | null) {
  const tr = await getTr();
  for (const m of crossedMilestones(before, after)) {
    const isDone = m === 100;
    await db.from("notifications").insert({
      user_id: userId,
      category: "goal",
      kind: isDone ? "goal_completed" : "goal_milestone",
      priority: "normal",
      status: "unread",
      entity_type: "goal",
      entity_id: `${goal.id}:${m}`,
      title: isDone
        ? tr("Objectif atteint : {title} 🎉", { title: goal.title })
        : tr("{m} % de votre objectif : {title}", { m, title: goal.title }),
      body: isDone
        ? tr("Bravo ! Vous avez atteint votre objectif « {title} ». Il reste consultable dans votre historique.", { title: goal.title })
        : tr("Belle progression ! Vous avez franchi {m} % de « {title} ». Continuez sur cette lancée.", { m, title: goal.title }),
      link: `/goals/${goal.id}`,
      metadata: { goal_id: goal.id, milestone: m },
      idempotency_key: `goal:${goal.id}:milestone:${m}`,
    });
    // Erreur de doublon ignorée : le palier a déjà été célébré
  }
}

async function loadGoalWithSteps(db: any, userId: string, goalId: string) {
  const [{ data: goal }, { data: steps }] = await Promise.all([
    db.from("goals").select("*").eq("id", goalId).eq("user_id", userId).maybeSingle(),
    db.from("goal_steps").select("*").eq("goal_id", goalId).eq("user_id", userId).order("position"),
  ]);
  return { goal: goal as GoalRow | null, steps: (steps ?? []) as StepRow[] };
}

// ---------------------------------------------------------------------------
// Objectifs
// ---------------------------------------------------------------------------

export async function createGoal(input: GoalInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, db, user } = await requireUser();
    const tr = await getTr();
    let parsed;
    try {
      parsed = goalInputSchema.parse(input);
    } catch (e) {
      return { ok: false, error: tr(firstIssue(e, "Vérifiez les informations de l'objectif.")) };
    }

    const quotaError = await checkPersonalGoalQuota(supabase, user.id);
    if (quotaError) return { ok: false, error: quotaError };

    const { data: created, error } = await db
      .from("goals")
      .insert({
        user_id: user.id,
        ...goalColumns(parsed),
        current_value: parsed.kind === "quantitative" ? parsed.startValue ?? 0 : 0,
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: tr("Impossible de créer l'objectif. Réessayez.") };

    const steps = (parsed.steps ?? []).map((s, i) => ({ user_id: user.id, goal_id: created.id, position: i, ...stepColumns(s) }));
    if (steps.length) await db.from("goal_steps").insert(steps);

    refresh(created.id);
    return { ok: true, data: { id: created.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

export async function updateGoal(goalId: string, input: GoalInput): Promise<ActionResult> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    let parsed;
    try {
      parsed = goalInputSchema.parse(input);
    } catch (e) {
      return { ok: false, error: tr(firstIssue(e, "Vérifiez les informations de l'objectif.")) };
    }
    const { error } = await db.from("goals").update(goalColumns(parsed)).eq("id", goalId).eq("user_id", user.id);
    if (error) return { ok: false, error: tr("Impossible d'enregistrer les modifications.") };
    refresh(goalId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

export async function setGoalStatus(goalId: string, status: GoalStatus): Promise<ActionResult> {
  try {
    const { supabase, db, user } = await requireUser();
    const tr = await getTr();
    const { goal } = await loadGoalWithSteps(db, user.id, goalId);
    if (!goal) return { ok: false, error: tr("Objectif introuvable.") };

    // Réactiver un objectif terminé ou archivé compte dans le quota
    if ((status === "active" || status === "paused") && !["active", "paused"].includes(goal.status)) {
      const quotaError = await checkPersonalGoalQuota(supabase, user.id);
      if (quotaError) return { ok: false, error: quotaError };
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from("goals")
      .update({ status, completed_at: status === "completed" ? now : null, updated_at: now })
      .eq("id", goalId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: tr("Impossible de changer le statut.") };

    await db.from("goal_progress_entries").insert({ goal_id: goalId, user_id: user.id, kind: "status", note: status });
    if (status === "completed") await celebrateMilestones(db, user.id, goal, 99, 100);
    refresh(goalId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    // Les tâches éventuellement créées depuis les étapes sont conservées (lien remis à vide par la base)
    const { error } = await db.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
    if (error) return { ok: false, error: tr("Impossible de supprimer l'objectif.") };
    refresh();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

/** Objectif quantitatif : ajouter une progression (ex. +50 pompes) ou fixer la nouvelle valeur. */
export async function recordGoalProgress(
  goalId: string,
  params: { mode: "add" | "set"; value: number; note?: string }
): Promise<ActionResult> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    const value = Number(params.value);
    if (!Number.isFinite(value)) return { ok: false, error: tr("Indiquez une valeur valide.") };

    const { goal, steps } = await loadGoalWithSteps(db, user.id, goalId);
    if (!goal) return { ok: false, error: tr("Objectif introuvable.") };
    if (goal.kind !== "quantitative") return { ok: false, error: tr("Cet objectif se suit par étapes.") };

    const today = await todayFor(db, user.id);
    const before = computeGoalProgress(goal, steps, today).percent;
    const newValue = params.mode === "add" ? Number(goal.current_value) + value : value;
    const now = new Date().toISOString();

    const { error } = await db
      .from("goals")
      .update({ current_value: newValue, last_progress_at: now, updated_at: now })
      .eq("id", goalId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: tr("Impossible d'enregistrer la progression.") };

    await db.from("goal_progress_entries").insert({
      goal_id: goalId,
      user_id: user.id,
      kind: "value",
      value_delta: newValue - Number(goal.current_value),
      value_after: newValue,
      note: params.note?.trim().slice(0, 300) || null,
    });

    const after = computeGoalProgress({ ...goal, current_value: newValue }, steps, today).percent;
    await celebrateMilestones(db, user.id, goal, before, after);
    refresh(goalId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

// ---------------------------------------------------------------------------
// Étapes / sous-objectifs
// ---------------------------------------------------------------------------

export async function addGoalStep(goalId: string, input: StepInput): Promise<ActionResult> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    let parsed;
    try {
      parsed = stepInputSchema.parse(input);
    } catch (e) {
      return { ok: false, error: tr(firstIssue(e, "Vérifiez l'étape.")) };
    }
    const { goal, steps } = await loadGoalWithSteps(db, user.id, goalId);
    if (!goal) return { ok: false, error: tr("Objectif introuvable.") };
    if (steps.length >= 60) return { ok: false, error: tr("60 étapes maximum par objectif.") };

    const position = steps.length ? Math.max(...steps.map((s) => s.position)) + 1 : 0;
    const { error } = await db.from("goal_steps").insert({ user_id: user.id, goal_id: goalId, position, ...stepColumns(parsed) });
    if (error) return { ok: false, error: tr("Impossible d'ajouter l'étape.") };
    refresh(goalId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

export async function updateGoalStep(stepId: string, input: StepInput): Promise<ActionResult> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    let parsed;
    try {
      parsed = stepInputSchema.parse(input);
    } catch (e) {
      return { ok: false, error: tr(firstIssue(e, "Vérifiez l'étape.")) };
    }
    const { data: step, error } = await db
      .from("goal_steps")
      .update(stepColumns(parsed))
      .eq("id", stepId)
      .eq("user_id", user.id)
      .select("goal_id")
      .maybeSingle();
    if (error || !step) return { ok: false, error: tr("Impossible de modifier l'étape.") };
    refresh(step.goal_id);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

export async function deleteGoalStep(stepId: string): Promise<ActionResult> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    const { data: step, error } = await db.from("goal_steps").delete().eq("id", stepId).eq("user_id", user.id).select("goal_id").maybeSingle();
    if (error || !step) return { ok: false, error: tr("Impossible de supprimer l'étape.") };
    refresh(step.goal_id);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

/** Monter ou descendre une étape dans la liste. */
export async function moveGoalStep(stepId: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    const { data: step } = await db.from("goal_steps").select("id, goal_id").eq("id", stepId).eq("user_id", user.id).maybeSingle();
    if (!step) return { ok: false, error: tr("Étape introuvable.") };
    const { steps } = await loadGoalWithSteps(db, user.id, step.goal_id);
    const idx = steps.findIndex((s) => s.id === stepId);
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= steps.length) return { ok: true };

    const ordered = [...steps];
    const a = ordered[idx]!;
    ordered[idx] = ordered[swap]!;
    ordered[swap] = a;
    await Promise.all(
      ordered.map((s, i) => (s.position === i ? null : db.from("goal_steps").update({ position: i }).eq("id", s.id).eq("user_id", user.id)))
    );
    refresh(step.goal_id);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

export async function setGoalStepStatus(stepId: string, status: StepStatus): Promise<ActionResult> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    const { data: current } = await db.from("goal_steps").select("id, goal_id, status").eq("id", stepId).eq("user_id", user.id).maybeSingle();
    if (!current) return { ok: false, error: tr("Étape introuvable.") };

    const { goal, steps } = await loadGoalWithSteps(db, user.id, current.goal_id);
    if (!goal) return { ok: false, error: tr("Objectif introuvable.") };
    const today = await todayFor(db, user.id);
    const before = computeGoalProgress(goal, steps, today).percent;

    const now = new Date().toISOString();
    const { error } = await db
      .from("goal_steps")
      .update({ status, completed_at: status === "done" ? now : null, updated_at: now })
      .eq("id", stepId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: tr("Impossible de mettre à jour l'étape.") };

    if (status === "done" || current.status === "done") {
      await db.from("goal_progress_entries").insert({
        goal_id: current.goal_id,
        step_id: stepId,
        user_id: user.id,
        kind: status === "done" ? "step_done" : "step_reopened",
      });
      await db.from("goals").update({ last_progress_at: now }).eq("id", current.goal_id).eq("user_id", user.id);
    }

    const updatedSteps = steps.map((s) => (s.id === stepId ? { ...s, status } : s));
    const after = computeGoalProgress(goal, updatedSteps, today).percent;
    if (status === "done") await celebrateMilestones(db, user.id, goal, before, after);
    refresh(current.goal_id);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}

/**
 * « Ajouter au calendrier » : crée UNE tâche liée à l'étape, seulement si l'utilisateur le demande.
 * Un second appel ne crée pas de doublon.
 */
export async function addGoalStepToTasks(stepId: string): Promise<ActionResult<{ taskId: string }>> {
  try {
    const { db, user } = await requireUser();
    const tr = await getTr();
    const { data: step } = await db.from("goal_steps").select("*").eq("id", stepId).eq("user_id", user.id).maybeSingle();
    if (!step) return { ok: false, error: tr("Étape introuvable.") };
    if (step.linked_task_id) {
      const { data: existing } = await db.from("tasks").select("id").eq("id", step.linked_task_id).eq("user_id", user.id).maybeSingle();
      if (existing) return { ok: true, data: { taskId: existing.id } };
    }
    const { data: goal } = await db.from("goals").select("title").eq("id", step.goal_id).eq("user_id", user.id).maybeSingle();

    const { data: task, error } = await db
      .from("tasks")
      .insert({
        user_id: user.id,
        title: `🎯 ${step.title}`.slice(0, 200),
        description: goal?.title ? tr("Étape de l'objectif « {title} »", { title: goal.title }) : null,
        priority: "medium",
        due_date: step.due_date,
        status: "todo",
      })
      .select("id")
      .single();
    if (error || !task) return { ok: false, error: tr("Impossible de créer la tâche.") };

    await db.from("goal_steps").update({ linked_task_id: task.id }).eq("id", stepId).eq("user_id", user.id);
    refresh(step.goal_id);
    revalidatePath("/tasks");
    return { ok: true, data: { taskId: task.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur inattendue." };
  }
}
