"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { GOAL_DOMAINS, type GoalDomain, type GoalProgress } from "@/lib/goals/progress";

/** Petits éléments visuels partagés du module « Mes Objectifs ». */

export function DomainChip({ domain }: { domain: GoalDomain }) {
  const { tr } = useLanguage();
  const d = GOAL_DOMAINS.find((x) => x.value === domain) ?? GOAL_DOMAINS[GOAL_DOMAINS.length - 1]!;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink-200/80 bg-ink-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-300">
      <span aria-hidden="true">{d.emoji}</span>
      {tr(d.label)}
    </span>
  );
}

export function PaceBadge({ progress }: { progress: GoalProgress }) {
  const { tr } = useLanguage();
  if (progress.overdue)
    return <Badge className="bg-danger/10 text-danger border-danger/30">{tr("Échéance dépassée")}</Badge>;
  if (progress.pace === "behind")
    return <Badge className="bg-warning/15 text-amber-700 dark:text-amber-300 border-warning/30">{tr("En retard sur le rythme")}</Badge>;
  if (progress.pace === "ahead")
    return <Badge className="bg-positive/10 text-emerald-700 dark:text-emerald-300 border-positive/30">{tr("En avance")}</Badge>;
  if (progress.pace === "on_track")
    return <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30">{tr("Dans les temps")}</Badge>;
  return null;
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${className}`}>{children}</span>;
}

/** Barre de progression ; affiche « — » quand aucun pourcentage n'est calculable (jamais inventé). */
export function ProgressBar({ percent, expected }: { percent: number | null; expected?: number | null }) {
  const value = percent ?? 0;
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-signal transition-[width] duration-500"
        style={{ width: `${value}%` }}
      />
      {expected !== null && expected !== undefined && expected > 0 && expected < 100 && (
        <span
          className="absolute top-0 h-full w-0.5 bg-ink-950/50 dark:bg-white/60"
          style={{ left: `${expected}%` }}
          title="Avancement attendu aujourd'hui"
        />
      )}
    </div>
  );
}

/** Anneau de progression (page de détail). */
export function ProgressRing({ percent }: { percent: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const value = percent ?? 0;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} strokeWidth="10" className="fill-none stroke-ink-100 dark:stroke-white/10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          strokeWidth="10"
          strokeLinecap="round"
          className="fill-none stroke-signal transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tabular-nums text-ink-950 dark:text-white">
          {percent === null ? "—" : `${Math.round(value)} %`}
        </span>
      </div>
    </div>
  );
}

export function formatNumber(n: number | null | undefined, locale: string): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat(locale || "fr", { maximumFractionDigits: 2 }).format(Number(n));
}
