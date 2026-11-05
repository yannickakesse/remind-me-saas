"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Pause, Play, Trophy, Archive, Trash2, Plus, Check, ChevronUp, ChevronDown,
  CalendarPlus, CalendarCheck, Quote, History, SkipForward, RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { PageBackground } from "@/components/shared/page-background";
import { STEP_PERIODS, type GoalProgress, type GoalRow, type GoalStatus, type StepPeriod, type StepRow, type StepStatus } from "@/lib/goals/progress";
import {
  setGoalStatus, deleteGoal, recordGoalProgress, addGoalStep, deleteGoalStep, moveGoalStep,
  setGoalStepStatus, addGoalStepToTasks, type ActionResult,
} from "@/app/(app)/goals/actions";
import { DomainChip, PaceBadge, ProgressBar, ProgressRing, formatNumber } from "./goal-ui";

export interface ProgressEntry {
  id: string;
  kind: "value" | "step_done" | "step_reopened" | "status" | "note";
  value_delta: number | null;
  value_after: number | null;
  note: string | null;
  recorded_at: string;
  step_id: string | null;
}

const CARD = "rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-5 sm:p-6 shadow-xs backdrop-blur-xl";
const INPUT =
  "w-full min-w-0 h-11 rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3.5 text-sm text-ink-950 dark:text-white placeholder:text-ink-400 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal";

export function GoalDetail({
  goal,
  steps,
  progress,
  entries,
  today,
}: {
  goal: GoalRow;
  steps: StepRow[];
  progress: GoalProgress;
  entries: ProgressEntry[];
  today: string;
}) {
  const { tr, locale } = useLanguage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState("");
  const [progressMode, setProgressMode] = useState<"add" | "set">("add");
  const [newStep, setNewStep] = useState<{ title: string; period: StepPeriod; dueDate: string }>({ title: "", period: "custom", dueDate: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(fn: () => Promise<ActionResult<any>>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  const status = goal.status;
  const isOpen = status === "active" || status === "paused";
  const stepTitle = (id: string | null) => steps.find((s) => s.id === id)?.title;
  const fmtDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(locale || "fr", { day: "numeric", month: "short", year: "numeric" });
  const statusAction = (s: GoalStatus) => run(() => setGoalStatus(goal.id, s));

  return (
    <div className="relative isolate min-h-full w-full space-y-5">
      <PageBackground src="/images/backgrounds/tasks-upcoming-bg.jpg" />

      <Link href="/goals" className="inline-flex items-center gap-1.5 rounded-full bg-canvas-raised/90 dark:bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-ink-800 dark:text-ink-200 shadow-2xs">
        <ArrowLeft className="h-3.5 w-3.5" /> {tr("Mes Objectifs")}
      </Link>

      {/* En-tête : titre, domaine, progression */}
      <section className={`${CARD} text-center`}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <DomainChip domain={goal.domain} />
            <PaceBadge progress={progress} />
            {status !== "active" && (
              <span className="rounded-full bg-ink-100 dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-ink-700 dark:text-ink-300">
                {status === "paused" ? tr("En pause") : status === "completed" ? tr("Terminé") : status === "abandoned" ? tr("Abandonné") : tr("Archivé")}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">{goal.title}</h1>
          {goal.description && <p className="max-w-lg text-sm text-ink-700 dark:text-ink-300">{goal.description}</p>}

          <ProgressRing percent={progress.percent} />

          <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">
            {goal.kind === "quantitative"
              ? `${formatNumber(goal.current_value, locale)} / ${formatNumber(goal.target_value, locale)} ${goal.unit ?? ""}`
              : progress.stepsTotal > 0
              ? tr("{done} étape(s) terminée(s) sur {total}", { done: progress.stepsDone, total: progress.stepsTotal })
              : tr("Ajoutez des étapes pour mesurer votre progression")}
          </p>
          {goal.expected_result && <p className="text-xs text-ink-600 dark:text-ink-400">{tr("Résultat visé : {r}", { r: goal.expected_result })}</p>}

          <div className="grid w-full max-w-md grid-cols-3 gap-2 text-center">
            <Stat label={tr("Début")} value={fmtDate(goal.start_date)} />
            <Stat label={tr("Échéance")} value={goal.due_date ? fmtDate(goal.due_date) : "—"} />
            <Stat
              label={tr("Temps restant")}
              value={progress.daysLeft === null ? "—" : progress.daysLeft >= 0 ? tr("{n} j", { n: progress.daysLeft }) : tr("Dépassée")}
            />
          </div>
          {progress.expectedPercent !== null && progress.percent !== null && isOpen && (
            <div className="w-full max-w-md space-y-1">
              <ProgressBar percent={progress.percent} expected={progress.expectedPercent} />
              <p className="text-[11px] text-ink-600 dark:text-ink-400">
                {tr("Réalisé : {a} % · attendu à ce jour : {b} %", { a: Math.round(progress.percent), b: progress.expectedPercent })}
              </p>
            </div>
          )}
        </div>
      </section>

      {goal.motivation && (
        <section className={`${CARD} relative`}>
          <Quote className="absolute left-4 top-4 h-5 w-5 text-signal/40" />
          <p className="px-6 text-center text-sm italic text-ink-800 dark:text-ink-200">{goal.motivation}</p>
          <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider text-signal">{tr("Ma motivation")}</p>
        </section>
      )}

      {/* Progression chiffrée */}
      {goal.kind === "quantitative" && isOpen && (
        <section className={CARD}>
          <h2 className="mb-3 text-center text-sm font-extrabold uppercase tracking-wider text-signal">{tr("Mettre à jour ma progression")}</h2>
          <div className="mb-3 flex justify-center gap-1.5">
            {(["add", "set"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setProgressMode(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${progressMode === m ? "bg-signal text-white" : "bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-300"}`}>
                {m === "add" ? tr("Ajouter") : tr("Nouvelle valeur")}
              </button>
            ))}
          </div>
          <form
            className="mx-auto flex max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(progressValue.replace(",", "."));
              run(() => recordGoalProgress(goal.id, { mode: progressMode, value: v }), () => setProgressValue(""));
            }}
          >
            <input inputMode="decimal" required className={INPUT} value={progressValue} onChange={(e) => setProgressValue(e.target.value)}
              placeholder={progressMode === "add" ? tr("Ex. : 50 {u}", { u: goal.unit ?? "" }) : formatNumber(goal.current_value, locale)} />
            <button type="submit" disabled={pending} className="h-11 shrink-0 rounded-xl bg-signal px-4 text-sm font-bold text-white disabled:opacity-60">
              {tr("Valider")}
            </button>
          </form>
        </section>
      )}

      {/* Étapes */}
      <section className={CARD}>
        <h2 className="mb-1 text-center text-sm font-extrabold uppercase tracking-wider text-signal">{tr("Étapes")}</h2>
        <p className="mb-4 text-center text-xs text-ink-600 dark:text-ink-400">
          {progress.stepsTotal > 0
            ? tr("{done} terminée(s), {left} restante(s)", { done: progress.stepsDone, left: progress.stepsRemaining }) +
              (progress.overdueSteps > 0 ? ` · ${tr("{n} en retard", { n: progress.overdueSteps })}` : "")
            : tr("Découpez votre objectif en sous-objectifs : par jour, semaine, mois, ou à votre façon.")}
        </p>

        <ul className="space-y-2.5">
          {steps.map((s, i) => {
            const late = s.status !== "done" && s.status !== "skipped" && s.due_date && s.due_date < today;
            const next: StepStatus = s.status === "done" ? "todo" : "done";
            return (
              <li key={s.id}
                className={`rounded-2xl border p-3 ${s.status === "done" ? "border-positive/30 bg-positive/5" : late ? "border-danger/30 bg-danger/5" : "border-ink-200/80 dark:border-white/10 bg-canvas dark:bg-slate-950/50"}`}>
                <div className="flex items-start gap-3">
                  <button type="button" disabled={!isOpen || pending || s.status === "skipped"} onClick={() => run(() => setGoalStepStatus(s.id, next))}
                    aria-label={s.status === "done" ? tr("Rouvrir l'étape") : tr("Marquer l'étape comme terminée")}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${s.status === "done" ? "border-positive bg-positive text-white" : "border-ink-300 dark:border-white/30"}`}>
                    {s.status === "done" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${s.status === "done" ? "text-ink-500 line-through" : s.status === "skipped" ? "text-ink-400 line-through" : "text-ink-950 dark:text-white"}`}>{s.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-600 dark:text-ink-400">
                      <span className="rounded-full bg-ink-100 dark:bg-white/10 px-2 py-0.5 font-semibold">{tr(STEP_PERIODS.find((p) => p.value === s.period)?.label ?? "")}</span>
                      {s.due_date && <span className={late ? "font-bold text-danger" : ""}>{tr("Pour le {d}", { d: fmtDate(s.due_date) })}</span>}
                      {s.status === "skipped" && <span>{tr("Ignorée")}</span>}
                      {s.linked_task_id && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CalendarCheck className="h-3 w-3" /> {tr("Dans vos tâches")}</span>
                      )}
                    </div>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-end gap-1">
                    <IconBtn label={tr("Monter")} disabled={i === 0 || pending} onClick={() => run(() => moveGoalStep(s.id, "up"))}><ChevronUp className="h-4 w-4" /></IconBtn>
                    <IconBtn label={tr("Descendre")} disabled={i === steps.length - 1 || pending} onClick={() => run(() => moveGoalStep(s.id, "down"))}><ChevronDown className="h-4 w-4" /></IconBtn>
                    {!s.linked_task_id && s.status !== "done" && (
                      <IconBtn label={tr("Ajouter à mes tâches")} disabled={pending} onClick={() => run(() => addGoalStepToTasks(s.id))}><CalendarPlus className="h-4 w-4" /></IconBtn>
                    )}
                    {s.status !== "done" && (
                      <IconBtn label={s.status === "skipped" ? tr("Reprendre l'étape") : tr("Ignorer l'étape")} disabled={pending}
                        onClick={() => run(() => setGoalStepStatus(s.id, s.status === "skipped" ? "todo" : "skipped"))}>
                        {s.status === "skipped" ? <RotateCcw className="h-4 w-4" /> : <SkipForward className="h-4 w-4" />}
                      </IconBtn>
                    )}
                    <IconBtn label={tr("Supprimer l'étape")} danger disabled={pending} onClick={() => run(() => deleteGoalStep(s.id))}><Trash2 className="h-4 w-4" /></IconBtn>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {isOpen && (
          <form
            className="mt-4 grid grid-cols-2 gap-2.5 border-t border-ink-200/70 dark:border-white/10 pt-4 sm:grid-cols-[1fr_9rem_9rem]"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addGoalStep(goal.id, newStep), () => setNewStep({ title: "", period: newStep.period, dueDate: "" }));
            }}
          >
            <input required maxLength={160} className={`${INPUT} col-span-2 sm:col-span-1`} placeholder={tr("Nouvelle étape")}
              value={newStep.title} onChange={(e) => setNewStep({ ...newStep, title: e.target.value })} />
            <select className={INPUT} value={newStep.period} onChange={(e) => setNewStep({ ...newStep, period: e.target.value as StepPeriod })}>
              {STEP_PERIODS.map((p) => <option key={p.value} value={p.value}>{tr(p.label)}</option>)}
            </select>
            <input type="date" className={`${INPUT} text-center`} value={newStep.dueDate} onChange={(e) => setNewStep({ ...newStep, dueDate: e.target.value })} />
            <button type="submit" disabled={pending}
              className="col-span-2 sm:col-span-3 mx-auto inline-flex items-center gap-1.5 rounded-full border border-signal/30 bg-signal/10 px-5 py-2 text-xs font-bold text-signal">
              <Plus className="h-3.5 w-3.5" /> {tr("Ajouter l'étape")}
            </button>
          </form>
        )}
      </section>

      {/* Historique */}
      <section className={CARD}>
        <h2 className="mb-3 flex items-center justify-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-signal">
          <History className="h-4 w-4" /> {tr("Historique")}
        </h2>
        {entries.length === 0 ? (
          <p className="text-center text-xs text-ink-600 dark:text-ink-400">{tr("Vos progrès apparaîtront ici au fil du temps.")}</p>
        ) : (
          <ol className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-xl bg-canvas dark:bg-slate-950/50 p-2.5 text-xs">
                <span className="w-20 shrink-0 font-semibold text-ink-500">{fmtDate(e.recorded_at)}</span>
                <span className="text-ink-800 dark:text-ink-200">
                  {e.kind === "value"
                    ? tr("Progression : {d} → {v}", {
                        d: `${(e.value_delta ?? 0) >= 0 ? "+" : ""}${formatNumber(e.value_delta, locale)}`,
                        v: `${formatNumber(e.value_after, locale)} ${goal.unit ?? ""}`,
                      })
                    : e.kind === "step_done"
                    ? tr("Étape terminée : {t}", { t: stepTitle(e.step_id) ?? tr("étape supprimée") })
                    : e.kind === "step_reopened"
                    ? tr("Étape rouverte : {t}", { t: stepTitle(e.step_id) ?? tr("étape supprimée") })
                    : e.kind === "status"
                    ? tr("Statut : {s}", {
                        s: e.note === "completed" ? tr("Terminé") : e.note === "paused" ? tr("En pause") : e.note === "active" ? tr("En cours") : e.note === "abandoned" ? tr("Abandonné") : tr("Archivé"),
                      })
                    : e.note}
                  {e.kind === "value" && e.note ? ` — ${e.note}` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center text-sm font-medium text-danger">{error}</p>}

      {/* Actions sur l'objectif */}
      <section className={`${CARD} flex flex-wrap justify-center gap-2`}>
        <Link href={`/goals/${goal.id}/edit`} className={actionBtn}><Pencil className="h-3.5 w-3.5" /> {tr("Modifier")}</Link>
        {status === "active" && <button type="button" className={actionBtn} disabled={pending} onClick={() => statusAction("paused")}><Pause className="h-3.5 w-3.5" /> {tr("Mettre en pause")}</button>}
        {status !== "active" && <button type="button" className={actionBtn} disabled={pending} onClick={() => statusAction("active")}><Play className="h-3.5 w-3.5" /> {tr("Reprendre")}</button>}
        {isOpen && <button type="button" className={`${actionBtn} border-positive/40 text-emerald-700 dark:text-emerald-300`} disabled={pending} onClick={() => statusAction("completed")}><Trophy className="h-3.5 w-3.5" /> {tr("Objectif atteint")}</button>}
        {isOpen && <button type="button" className={actionBtn} disabled={pending} onClick={() => statusAction("abandoned")}>{tr("Abandonner")}</button>}
        {status !== "archived" && <button type="button" className={actionBtn} disabled={pending} onClick={() => statusAction("archived")}><Archive className="h-3.5 w-3.5" /> {tr("Archiver")}</button>}
        {!confirmDelete ? (
          <button type="button" className={`${actionBtn} border-danger/30 text-danger`} onClick={() => setConfirmDelete(true)}><Trash2 className="h-3.5 w-3.5" /> {tr("Supprimer")}</button>
        ) : (
          <span className="flex items-center gap-2 rounded-full border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-semibold text-danger">
            {tr("Supprimer définitivement ?")}
            <button type="button" className="font-extrabold underline" disabled={pending} onClick={() => run(() => deleteGoal(goal.id), () => router.push("/goals"))}>{tr("Oui")}</button>
            <button type="button" className="font-bold" onClick={() => setConfirmDelete(false)}>{tr("Non")}</button>
          </span>
        )}
      </section>
    </div>
  );
}

const actionBtn =
  "inline-flex items-center gap-1.5 rounded-full border border-ink-200 dark:border-white/15 bg-canvas dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-ink-800 dark:text-ink-200 disabled:opacity-50";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas dark:bg-slate-950/50 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-ink-950 dark:text-white">{value}</p>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${danger ? "text-danger hover:bg-danger/10" : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/10"}`}>
      {children}
    </button>
  );
}
