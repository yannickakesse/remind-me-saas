"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Target, CalendarClock, ListChecks, Trophy } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { PageBackground } from "@/components/shared/page-background";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";
import type { GoalProgress, GoalRow } from "@/lib/goals/progress";
import { DomainChip, PaceBadge, ProgressBar, formatNumber } from "./goal-ui";

export interface GoalListItem {
  goal: GoalRow;
  progress: GoalProgress;
}

type Tab = "active" | "paused" | "completed" | "archived";

export function GoalsView({
  items,
  moduleReady,
  quota,
}: {
  items: GoalListItem[];
  moduleReady: boolean;
  quota: { used: number; max: number | null };
}) {
  const { tr, locale } = useLanguage();
  const [tab, setTab] = useState<Tab>("active");

  const groups = useMemo(
    () => ({
      active: items.filter((i) => i.goal.status === "active"),
      paused: items.filter((i) => i.goal.status === "paused"),
      completed: items.filter((i) => i.goal.status === "completed"),
      archived: items.filter((i) => i.goal.status === "archived" || i.goal.status === "abandoned"),
    }),
    [items]
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "active", label: tr("En cours") },
    { key: "paused", label: tr("En pause") },
    { key: "completed", label: tr("Terminés") },
    { key: "archived", label: tr("Archivés") },
  ];
  const list = groups[tab];
  const limitReached = quota.max !== null && quota.used >= quota.max;

  return (
    <div className="relative isolate min-h-full w-full space-y-6">
      <PageBackground src="/images/backgrounds/tasks-upcoming-bg.jpg" />

      {/* En-tête centré */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-7 shadow-xs text-center">
        <div className="absolute -top-12 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-signal/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/20 bg-signal/10 px-3 py-1 text-[11px] font-bold text-signal">
            <Target className="h-3.5 w-3.5" />
            {quota.max === null
              ? tr("{n} objectif(s) en cours", { n: quota.used })
              : tr("{n} / {max} objectifs en cours", { n: quota.used, max: quota.max })}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">{tr("Mes Objectifs")}</h1>
          <p className="max-w-md text-xs sm:text-sm text-ink-600 dark:text-ink-400">
            {tr("Fixez-vous des objectifs dans tous les domaines de votre vie, découpez-les en étapes et suivez votre progression.")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <SectionGuideTrigger section="goals" label={tr("Guide")} />
            {moduleReady && !limitReached && (
              <Link
                href="/goals/new"
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(217,119,6,0.25)] transition-all hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" strokeWidth={2.8} />
                {tr("Nouvel objectif")}
              </Link>
            )}
          </div>
          {limitReached && (
            <p className="max-w-md text-xs font-medium text-amber-700 dark:text-amber-300">
              {tr("Limite de votre forfait atteinte : terminez ou archivez un objectif pour en créer un nouveau, ou passez au forfait supérieur.")}
            </p>
          )}
        </div>
      </section>

      {!moduleReady ? (
        <div className="rounded-3xl border border-dashed border-ink-300 dark:border-white/15 bg-canvas-raised/90 dark:bg-slate-900/80 p-8 text-center text-sm text-ink-700 dark:text-ink-300">
          {tr("Le module « Mes Objectifs » sera disponible très bientôt.")}
        </div>
      ) : (
        <>
          {/* Onglets centrés */}
          <div className="flex justify-center">
            <div className="flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-ink-200/80 dark:border-white/10 bg-canvas-raised/90 dark:bg-slate-900/80 p-1 shadow-2xs backdrop-blur-md">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    tab === t.key ? "bg-signal text-white shadow-xs" : "text-ink-700 hover:text-ink-950 dark:text-ink-300 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-white/20" : "bg-ink-100 dark:bg-white/10"}`}>
                    {groups[t.key].length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink-300 dark:border-white/15 bg-canvas-raised/90 dark:bg-slate-900/80 p-8 sm:p-10 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-signal/20 bg-signal/10 text-signal">
                {tab === "completed" ? <Trophy className="h-7 w-7" /> : <Target className="h-7 w-7" />}
              </div>
              <p className="text-base font-bold text-ink-950 dark:text-white">
                {tab === "active"
                  ? tr("Aucun objectif en cours")
                  : tab === "completed"
                  ? tr("Vos objectifs atteints apparaîtront ici")
                  : tr("Rien ici pour le moment")}
              </p>
              {tab === "active" && (
                <p className="mx-auto max-w-sm text-xs text-ink-600 dark:text-ink-400">
                  {tr("Apprendre l'anglais, lire 20 livres, économiser, réussir un examen… Créez votre premier objectif et découpez-le en étapes.")}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map(({ goal, progress }) => (
                <Link
                  key={goal.id}
                  href={`/goals/${goal.id}`}
                  className="group flex flex-col gap-3.5 rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-5 shadow-xs backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <DomainChip domain={goal.domain} />
                    <PaceBadge progress={progress} />
                  </div>
                  <h3 className="text-base font-bold text-ink-950 dark:text-white line-clamp-2 group-hover:text-signal transition-colors">{goal.title}</h3>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-700 dark:text-ink-300">
                        {goal.kind === "quantitative"
                          ? `${formatNumber(goal.current_value, locale)} / ${formatNumber(goal.target_value, locale)} ${goal.unit ?? ""}`
                          : tr("{done} / {total} étapes", { done: progress.stepsDone, total: progress.stepsTotal })}
                      </span>
                      <span className="font-extrabold tabular-nums text-signal">
                        {progress.percent === null ? "—" : `${Math.round(progress.percent)} %`}
                      </span>
                    </div>
                    <ProgressBar percent={progress.percent} expected={progress.expectedPercent} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-ink-600 dark:text-ink-400">
                    {goal.kind === "quantitative" && progress.stepsTotal > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" />
                        {tr("{done} / {total} étapes", { done: progress.stepsDone, total: progress.stepsTotal })}
                      </span>
                    )}
                    {progress.daysLeft !== null && goal.status !== "completed" && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {progress.daysLeft > 0
                          ? tr("{n} jours restants", { n: progress.daysLeft })
                          : progress.daysLeft === 0
                          ? tr("Échéance aujourd'hui")
                          : tr("Échéance dépassée de {n} jours", { n: -progress.daysLeft })}
                      </span>
                    )}
                    {goal.status === "completed" && goal.completed_at && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <Trophy className="h-3.5 w-3.5" />
                        {tr("Atteint le {date}", { date: new Date(goal.completed_at).toLocaleDateString(locale || "fr") })}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
