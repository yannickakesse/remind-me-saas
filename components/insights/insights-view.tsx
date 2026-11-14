"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert } from "lucide-react";
import { msg } from "@/lib/i18n/catalog";
import type { Insight, InsightDomain, InsightsOverview } from "@/lib/intelligence/rules";
import { InsightCard, LEVEL, SURFACE, TEXT_MAIN, TEXT_MUTED, TEXT_SOFT, useInsightFormat } from "./insight-list";

type Counts = { urgent: number; attention: number; info: number; total: number };
type Filter = "all" | InsightDomain;

const DOMAINS: { key: InsightDomain; label: string }[] = [
  { key: "agenda", label: msg("Agenda") },
  { key: "finances", label: msg("Finances") },
  { key: "goals", label: msg("Objectifs") },
];

function Header() {
  const { tr } = useInsightFormat();
  return (
    // Surface pleine : le titre reste lisible quelle que soit la photo de fond
    <header className={`rounded-2xl p-4 sm:p-6 ${SURFACE}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#214E3B] dark:text-[#7FD1AE]">{tr("Analyses")}</p>
      <h1 className={`mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${TEXT_MAIN}`}>{tr("Ce qui mérite votre attention")}</h1>
      <p className={`mt-1.5 max-w-2xl text-[13px] leading-relaxed sm:text-sm ${TEXT_SOFT}`}>
        {tr("Vos 7 prochains jours, vos budgets et vos objectifs, analysés uniquement à partir de vos données.")}
      </p>
    </header>
  );
}

/** Situation générale : une phrase, la répartition par gravité, un seul conseil général. */
function Overview({ counts, overview, className = "" }: { counts: Counts; overview: InsightsOverview; className?: string }) {
  const f = useInsightFormat();
  const tr = f.tr;
  const toTreat = counts.urgent + counts.attention;
  const Icon = counts.urgent > 0 ? ShieldAlert : toTreat > 0 ? AlertTriangle : CheckCircle2;
  const iconBox =
    counts.urgent > 0
      ? "bg-[#FDECEA] text-[#B42318] dark:bg-[#F28B82]/15 dark:text-[#F7A39B]"
      : toTreat > 0
        ? "bg-[#FBEFD9] text-[#8A5A00] dark:bg-[#F2B84B]/15 dark:text-[#F2C46B]"
        : "bg-[#E7F4EE] text-[#0F7A52] dark:bg-[#7FD1AE]/15 dark:text-[#7FD1AE]";
  const segments = [
    { n: counts.urgent, level: "urgent" as const, label: tr("{n} urgent(s)", { n: counts.urgent }) },
    { n: counts.attention, level: "attention" as const, label: tr("{n} à surveiller", { n: counts.attention }) },
    { n: counts.info, level: "info" as const, label: tr("{n} bon(s) à savoir", { n: counts.info }) },
  ];
  return (
    <section aria-label={tr("Vue d'ensemble")} className={`space-y-3.5 rounded-2xl p-4 sm:p-5 ${SURFACE} ${className}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBox}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className={`text-base font-semibold leading-snug ${TEXT_MAIN}`}>
          {toTreat > 0 ? tr("{n} point(s) à traiter", { n: toTreat }) : tr("Rien d'urgent à traiter")}
        </p>
      </div>
      {counts.total > 0 && (
        <div className="space-y-2">
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {segments.filter((s) => s.n > 0).map((s) => (
              <div key={s.level} className={LEVEL[s.level].dot} style={{ flex: s.n }} />
            ))}
          </div>
          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${TEXT_SOFT}`}>
            {segments.map((s) => (
              <span key={s.level} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${LEVEL[s.level].dot}`} aria-hidden="true" />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}
      {overview.advice && (
        <p className="flex gap-2.5 rounded-xl bg-[#EEF3EF] px-3 py-2.5 text-[13px] leading-relaxed text-[#1F3A2E] dark:bg-[#16302A] dark:text-[#E4EFE9]">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#214E3B] dark:text-[#7FD1AE]" aria-hidden="true" />
          <span>{tr(overview.advice.text, f.params(overview.advice.params))}</span>
        </p>
      )}
    </section>
  );
}

/** Charge des 7 prochains jours (temps occupé réel). */
function WeekLoad({ overview }: { overview: InsightsOverview }) {
  const f = useInsightFormat();
  const tr = f.tr;
  const max = Math.max(10 * 60, ...overview.days.map((d) => d.occupiedMinutes));
  return (
    <section className={`space-y-3 rounded-2xl p-5 ${SURFACE}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.06em] ${TEXT_MUTED}`}>{tr("Vos 7 prochains jours")}</p>
      <div className="grid h-24 grid-cols-7 items-end gap-1.5">
        {overview.days.map((d) => (
          <div key={d.date} className="flex h-full flex-col justify-end" title={`${f.day(d.date, false)} · ${f.duration(d.occupiedMinutes)}`}>
            <div
              className={`rounded-md ${
                d.state === "conflict"
                  ? "bg-[#B42318] dark:bg-[#F28B82]"
                  : d.state === "heavy"
                    ? "bg-[#D99A24] dark:bg-[#F2B84B]"
                    : "bg-[#CFDDD3] dark:bg-[#2F4A40]"
              }`}
              style={{ height: d.occupiedMinutes > 0 ? `${Math.max(6, (d.occupiedMinutes / max) * 100)}%` : "3px" }}
            />
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-7 gap-1.5 text-center text-[11px] leading-tight ${TEXT_MUTED}`}>
        {overview.days.map((d) => {
          const s = f.shortDay(d.date);
          return (
            <span key={d.date} className={d.state === "conflict" ? "font-bold text-[#B42318] dark:text-[#F7A39B]" : d.state === "heavy" ? "font-bold text-[#8A5A00] dark:text-[#F2C46B]" : ""}>
              {s.weekday}
              <br />
              {s.day}
            </span>
          );
        })}
      </div>
      <p className={`text-xs leading-relaxed ${TEXT_MUTED}`}>{tr("Hauteur : temps réellement occupé par vos séances (un chevauchement compte une fois).")}</p>
    </section>
  );
}

export function InsightsView({ insights, overview, counts }: { insights: Insight[]; overview: InsightsOverview; counts: Counts }) {
  const f = useInsightFormat();
  const tr = f.tr;
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => insights.filter((i) => i.level !== "insufficient"), [insights]);
  const notes = insights.filter((i) => i.level === "insufficient");
  const domains = DOMAINS.map((d) => ({ ...d, n: visible.filter((i) => i.domain === d.key).length })).filter((d) => d.n > 0);
  const list = filter === "all" ? visible : visible.filter((i) => i.domain === filter);
  const chip = (active: boolean) =>
    `h-9 shrink-0 rounded-full px-3.5 text-[13px] transition-colors ${
      active
        ? "bg-[#17211D] font-semibold text-white dark:bg-[#F3F1EC] dark:text-[#111822]"
        : "border border-[#E6E2D9] bg-white font-medium text-[#17211D] hover:bg-[#F7F6F2] dark:border-[#2A3647] dark:bg-[#1A2332] dark:text-[#F3F1EC] dark:hover:bg-[#111822]"
    }`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
      <Header />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-4">
          {/* Mobile : la situation générale avant la liste ; ordinateur : dans la colonne de droite */}
          <Overview counts={counts} overview={overview} className="xl:hidden" />

          {visible.length === 0 ? (
            <div className={`rounded-2xl p-8 text-center ${SURFACE}`}>
              <CheckCircle2 className="mx-auto h-7 w-7 text-[#0F7A52] dark:text-[#7FD1AE]" aria-hidden="true" />
              <p className={`mt-2 text-base font-semibold ${TEXT_MAIN}`}>{tr("Tout est sous contrôle")}</p>
              <p className={`mt-1 text-xs ${TEXT_SOFT}`}>{tr("Aucun point d'attention pour le moment. Les analyses se mettent à jour à chaque visite.")}</p>
            </div>
          ) : (
            <>
              {domains.length > 1 && (
                <nav aria-label={tr("Filtrer les analyses")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={chip(filter === "all")}>
                    {tr("Tout")} · {visible.length}
                  </button>
                  {domains.map((d) => (
                    <button key={d.key} type="button" onClick={() => setFilter(d.key)} aria-pressed={filter === d.key} className={chip(filter === d.key)}>
                      {tr(d.label)} · {d.n}
                    </button>
                  ))}
                </nav>
              )}
              <section aria-label={tr("Points d'attention")} className="space-y-2.5 sm:space-y-3">
                {list.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </section>
            </>
          )}

          {notes.map((n) => (
            <p key={n.id} className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${SURFACE} ${TEXT_MUTED}`}>
              {f.text(n).detail}
            </p>
          ))}
        </div>

        <aside aria-label={tr("Vue d'ensemble")} className="hidden space-y-3 xl:block">
          <Overview counts={counts} overview={overview} />
          <WeekLoad overview={overview} />
        </aside>
      </div>
      {/* Mobile : charge de la semaine en fin de page */}
      <div className="xl:hidden">
        <WeekLoad overview={overview} />
      </div>
    </div>
  );
}
