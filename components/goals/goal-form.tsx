"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wand2, Hash, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { GOAL_DOMAINS, STEP_PERIODS, type GoalDomain, type GoalKind, type StepPeriod } from "@/lib/goals/progress";
import type { GoalInput, StepInput } from "@/lib/validation/goals";
import type { ActionResult } from "@/app/(app)/goals/actions";

export interface GoalFormInitial {
  title: string;
  description: string;
  domain: GoalDomain;
  motivation: string;
  startDate: string;
  dueDate: string;
  kind: GoalKind;
  expectedResult: string;
  unit: string;
  startValue: string;
  targetValue: string;
  reminderFrequency: "" | "daily" | "weekly" | "monthly";
  reminderTime: string;
  reminderWeekday: string;
}

interface DraftStep {
  key: number;
  title: string;
  period: StepPeriod;
  dueDate: string;
}

const INPUT =
  "w-full min-w-0 h-11 rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3.5 text-sm text-ink-950 dark:text-white placeholder:text-ink-400 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal";
const AREA =
  "w-full min-w-0 rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3.5 py-2.5 text-sm text-ink-950 dark:text-white placeholder:text-ink-400 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal";
const LABEL = "mb-1 block text-xs font-bold text-ink-700 dark:text-ink-300";
const CARD = "rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-5 sm:p-6 shadow-xs backdrop-blur-xl space-y-4";

function addMonths(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function GoalForm({
  initial,
  action,
  submitLabel,
  withSteps = false,
}: {
  initial: GoalFormInitial;
  action: (input: GoalInput) => Promise<ActionResult<{ id: string }> | ActionResult>;
  submitLabel: string;
  /** Création : permet de préparer les étapes dès le départ. */
  withSteps?: boolean;
}) {
  const { tr } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<GoalFormInitial>(initial);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const set = <K extends keyof GoalFormInitial>(k: K, v: GoalFormInitial[K]) => setForm((f) => ({ ...f, [k]: v }));

  function addStep(title = "", period: StepPeriod = "custom", dueDate = "") {
    setSteps((s) => [...s, { key: Date.now() + Math.random(), title, period, dueDate }]);
  }

  /** Découpe automatique en étapes mensuelles entre la date de début et la date limite. */
  function splitByMonth() {
    if (!form.dueDate) {
      setError(tr("Indiquez d'abord une date limite pour découper l'objectif par mois."));
      return;
    }
    setError(null);
    const generated: DraftStep[] = [];
    let i = 1;
    let end = addMonths(form.startDate, 1);
    while (end <= addMonths(form.dueDate, 0) && i <= 24) {
      generated.push({ key: Date.now() + i, title: tr("Mois {n}", { n: i }), period: "monthly", dueDate: end > form.dueDate ? form.dueDate : end });
      i++;
      end = addMonths(form.startDate, i);
    }
    if (generated.length === 0 || generated[generated.length - 1]!.dueDate !== form.dueDate) {
      generated.push({ key: Date.now() + 99, title: tr("Mois {n}", { n: i }), period: "monthly", dueDate: form.dueDate });
    }
    setSteps(generated);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const payload: GoalInput = {
      title: form.title,
      description: form.description,
      domain: form.domain,
      motivation: form.motivation,
      startDate: form.startDate,
      dueDate: form.dueDate,
      kind: form.kind,
      expectedResult: form.expectedResult,
      unit: form.unit,
      startValue: form.startValue,
      targetValue: form.targetValue,
      reminderFrequency: form.reminderFrequency,
      reminderTime: form.reminderTime,
      reminderWeekday: form.reminderWeekday,
      steps: withSteps
        ? steps.filter((s) => s.title.trim()).map<StepInput>((s) => ({ title: s.title, period: s.period, dueDate: s.dueDate }))
        : undefined,
    };
    const res = await action(payload);
    if (!res.ok) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    const id = (res as any).data?.id as string | undefined;
    router.push(id ? `/goals/${id}` : "/goals");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-5">
      {/* 1. L'objectif */}
      <section className={CARD}>
        <h2 className="text-center text-sm font-extrabold uppercase tracking-wider text-signal">{tr("Votre objectif")}</h2>
        <div>
          <label className={LABEL} htmlFor="goal-title">{tr("Titre *")}</label>
          <input id="goal-title" className={INPUT} required maxLength={160} value={form.title}
            placeholder={tr("Ex. : Parler anglais couramment")} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <span className={LABEL}>{tr("Domaine")}</span>
          <div className="flex flex-wrap gap-2">
            {GOAL_DOMAINS.map((d) => (
              <button key={d.value} type="button" onClick={() => set("domain", d.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  form.domain === d.value
                    ? "border-signal bg-signal text-white"
                    : "border-ink-200 bg-canvas text-ink-700 hover:border-signal/50 dark:border-white/10 dark:bg-slate-900 dark:text-ink-300"
                }`}>
                <span aria-hidden="true">{d.emoji}</span> {tr(d.label)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={LABEL} htmlFor="goal-motivation">{tr("Pourquoi voulez-vous l'atteindre ?")}</label>
          <textarea id="goal-motivation" rows={2} maxLength={1000} className={AREA} value={form.motivation}
            placeholder={tr("Votre motivation : Remind Me vous la rappellera dans les moments de doute.")}
            onChange={(e) => set("motivation", e.target.value)} />
        </div>
        <div>
          <label className={LABEL} htmlFor="goal-desc">{tr("Description (facultatif)")}</label>
          <textarea id="goal-desc" rows={2} maxLength={2000} className={AREA} value={form.description}
            onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="min-w-0">
            <label className={LABEL} htmlFor="goal-start">{tr("Début")}</label>
            <input id="goal-start" type="date" required className={`${INPUT} text-center`} value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div className="min-w-0">
            <label className={LABEL} htmlFor="goal-due">{tr("Date limite (facultatif)")}</label>
            <input id="goal-due" type="date" min={form.startDate} className={`${INPUT} text-center`} value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)} />
          </div>
        </div>
      </section>

      {/* 2. Mesure de la réussite */}
      <section className={CARD}>
        <h2 className="text-center text-sm font-extrabold uppercase tracking-wider text-signal">{tr("Comment mesurer la réussite ?")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {([
            { k: "quantitative", icon: Hash, title: tr("Avec un chiffre"), hint: tr("1 400 pompes, 20 livres, 500 000 FCFA…") },
            { k: "qualitative", icon: Sparkles, title: tr("Par étapes"), hint: tr("Parler anglais, obtenir un diplôme…") },
          ] as const).map((o) => (
            <button key={o.k} type="button" onClick={() => set("kind", o.k)}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                form.kind === o.k ? "border-signal bg-signal/10" : "border-ink-200 bg-canvas dark:border-white/10 dark:bg-slate-900"
              }`}>
              <o.icon className={`mb-1 h-4 w-4 ${form.kind === o.k ? "text-signal" : "text-ink-500"}`} />
              <span className="block text-sm font-bold text-ink-950 dark:text-white">{o.title}</span>
              <span className="block text-[11px] text-ink-600 dark:text-ink-400">{o.hint}</span>
            </button>
          ))}
        </div>

        {form.kind === "quantitative" ? (
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="min-w-0">
              <label className={LABEL} htmlFor="goal-startv">{tr("Départ")}</label>
              <input id="goal-startv" inputMode="decimal" className={INPUT} value={form.startValue} placeholder="0"
                onChange={(e) => set("startValue", e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className={LABEL} htmlFor="goal-target">{tr("Cible *")}</label>
              <input id="goal-target" inputMode="decimal" required className={INPUT} value={form.targetValue} placeholder="1400"
                onChange={(e) => set("targetValue", e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className={LABEL} htmlFor="goal-unit">{tr("Unité")}</label>
              <input id="goal-unit" maxLength={40} className={INPUT} value={form.unit} placeholder={tr("pompes")}
                onChange={(e) => set("unit", e.target.value)} />
            </div>
          </div>
        ) : (
          <div>
            <label className={LABEL} htmlFor="goal-result">{tr("Résultat attendu")}</label>
            <input id="goal-result" maxLength={500} className={INPUT} value={form.expectedResult}
              placeholder={tr("Ex. : tenir une conversation de 30 minutes en anglais")}
              onChange={(e) => set("expectedResult", e.target.value)} />
          </div>
        )}
      </section>

      {/* 3. Étapes (création) */}
      {withSteps && (
        <section className={CARD}>
          <div className="text-center">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-signal">{tr("Étapes (facultatif)")}</h2>
            <p className="mt-1 text-xs text-ink-600 dark:text-ink-400">{tr("Découpez votre objectif en sous-objectifs. Vous pourrez les modifier ensuite.")}</p>
          </div>
          {steps.map((s, i) => (
            <div key={s.key} className={`grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end ${i > 0 ? "border-t border-ink-200/70 dark:border-white/10 pt-3" : ""}`}>
              <input className={`${INPUT} col-span-2 sm:col-span-1`} maxLength={160} value={s.title} placeholder={tr("Titre de l'étape")}
                onChange={(e) => setSteps((all) => all.map((x) => (x.key === s.key ? { ...x, title: e.target.value } : x)))} />
              <select className={INPUT} value={s.period}
                onChange={(e) => setSteps((all) => all.map((x) => (x.key === s.key ? { ...x, period: e.target.value as StepPeriod } : x)))}>
                {STEP_PERIODS.map((p) => <option key={p.value} value={p.value}>{tr(p.label)}</option>)}
              </select>
              <input type="date" className={`${INPUT} text-center`} value={s.dueDate}
                onChange={(e) => setSteps((all) => all.map((x) => (x.key === s.key ? { ...x, dueDate: e.target.value } : x)))} />
              <button type="button" aria-label={tr("Retirer l'étape")} onClick={() => setSteps((all) => all.filter((x) => x.key !== s.key))}
                className="col-span-2 sm:col-span-1 flex h-11 items-center justify-center rounded-xl text-danger hover:bg-danger/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => addStep()}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 dark:border-white/15 bg-canvas dark:bg-slate-900 px-4 py-2 text-xs font-bold text-ink-800 dark:text-ink-200">
              <Plus className="h-3.5 w-3.5" /> {tr("Ajouter une étape")}
            </button>
            <button type="button" onClick={splitByMonth}
              className="inline-flex items-center gap-1.5 rounded-full border border-signal/30 bg-signal/10 px-4 py-2 text-xs font-bold text-signal">
              <Wand2 className="h-3.5 w-3.5" /> {tr("Découper par mois")}
            </button>
          </div>
        </section>
      )}

      {/* 4. Rappel */}
      <section className={CARD}>
        <h2 className="text-center text-sm font-extrabold uppercase tracking-wider text-signal">{tr("Rappel (facultatif)")}</h2>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="min-w-0">
            <label className={LABEL} htmlFor="goal-freq">{tr("Fréquence")}</label>
            <select id="goal-freq" className={INPUT} value={form.reminderFrequency}
              onChange={(e) => set("reminderFrequency", e.target.value as GoalFormInitial["reminderFrequency"])}>
              <option value="">{tr("Aucun rappel")}</option>
              <option value="daily">{tr("Chaque jour")}</option>
              <option value="weekly">{tr("Chaque semaine")}</option>
              <option value="monthly">{tr("Chaque mois")}</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className={LABEL} htmlFor="goal-time">{tr("Heure")}</label>
            <input id="goal-time" type="time" disabled={!form.reminderFrequency} className={`${INPUT} text-center disabled:opacity-50`}
              value={form.reminderTime} onChange={(e) => set("reminderTime", e.target.value)} />
          </div>
        </div>
        {form.reminderFrequency === "weekly" && (
          <div>
            <label className={LABEL} htmlFor="goal-wd">{tr("Jour")}</label>
            <select id="goal-wd" className={INPUT} value={form.reminderWeekday} onChange={(e) => set("reminderWeekday", e.target.value)}>
              {[tr("Dimanche"), tr("Lundi"), tr("Mardi"), tr("Mercredi"), tr("Jeudi"), tr("Vendredi"), tr("Samedi")].map((d, i) => (
                <option key={i} value={String(i)}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center text-sm font-medium text-danger">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => router.back()} disabled={submitting}
          className="h-12 rounded-2xl border border-ink-200 dark:border-white/15 bg-canvas-raised dark:bg-slate-800 text-sm font-bold text-ink-800 dark:text-ink-200">
          {tr("Annuler")}
        </button>
        <button type="submit" disabled={submitting}
          className="h-12 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-sm font-bold text-white shadow-xs disabled:opacity-60">
          {submitting ? tr("Enregistrement…") : submitLabel}
        </button>
      </div>
    </form>
  );
}
