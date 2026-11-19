"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { msg } from "@/lib/i18n/catalog";
import type { Insight, InsightsOverview } from "@/lib/intelligence/rules";
import { SURFACE, TEXT_MAIN, TEXT_MUTED, TEXT_SOFT, useInsightFormat } from "./insight-list";

type Counts = { urgent: number; attention: number; info: number; total: number };

/**
 * Couleurs d'état (validées : séparation daltonisme, contraste sur la surface, clair ET sombre).
 * Toujours accompagnées d'un libellé (légende, info-bulle) : jamais la couleur seule.
 */
const STATE = {
  normal: { fill: "fill-[#16936A] dark:fill-[#3FA87C]", bg: "bg-[#16936A] dark:bg-[#3FA87C]", label: msg("Équilibrée") },
  heavy: { fill: "fill-[#B97A0C] dark:fill-[#BB882A]", bg: "bg-[#B97A0C] dark:bg-[#BB882A]", label: msg("Chargée") },
  conflict: { fill: "fill-[#B42318] dark:fill-[#C43E37]", bg: "bg-[#B42318] dark:bg-[#C43E37]", label: msg("Chevauchement") },
} as const;
const RING = {
  urgent: { stroke: "stroke-[#B42318] dark:stroke-[#C43E37]", bg: "bg-[#B42318] dark:bg-[#C43E37]", label: msg("Urgent") },
  attention: { stroke: "stroke-[#B97A0C] dark:stroke-[#BB882A]", bg: "bg-[#B97A0C] dark:bg-[#BB882A]", label: msg("À surveiller") },
  info: { stroke: "stroke-[#16936A] dark:stroke-[#3FA87C]", bg: "bg-[#16936A] dark:bg-[#3FA87C]", label: msg("Bon à savoir") },
} as const;

/** Anneau : répartition des points par gravité, le nombre à traiter au centre. */
function Ring({ counts }: { counts: Counts }) {
  const { tr } = useInsightFormat();
  const parts = (["urgent", "attention", "info"] as const).map((k) => ({ k, n: counts[k] })).filter((p) => p.n > 0);
  const total = parts.reduce((a, p) => a + p.n, 0);
  const r = 44;
  const c = 2 * Math.PI * r;
  const gap = parts.length > 1 ? 4 : 0; // 2 px de surface de chaque côté entre deux segments
  let offset = 0;
  const toTreat = counts.urgent + counts.attention;
  return (
    <div className="flex items-center gap-4 sm:flex-col sm:items-start">
      <div className="relative h-[112px] w-[112px] shrink-0">
        <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90" role="img" aria-label={tr("{n} point(s) à traiter", { n: toTreat })}>
          <circle cx="56" cy="56" r={r} fill="none" strokeWidth="10" className="stroke-[#EFECE5] dark:stroke-white/10" />
          {parts.map((p) => {
            const len = (p.n / total) * c;
            const seg = (
              <circle
                key={p.k}
                cx="56"
                cy="56"
                r={r}
                fill="none"
                strokeWidth="10"
                strokeLinecap="butt"
                className={RING[p.k].stroke}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-[28px] font-bold leading-none tabular-nums ${TEXT_MAIN}`}>{toTreat}</span>
          <span className={`mt-1 text-[11px] ${TEXT_MUTED}`}>{tr("à traiter")}</span>
        </div>
      </div>
      <ul className="space-y-1.5 text-xs">
        {(["urgent", "attention", "info"] as const).map((k) => (
          <li key={k} className={`flex items-center gap-2 ${TEXT_SOFT}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${RING[k].bg}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">{tr(RING[k].label)}</span>
            <b className={`tabular-nums ${TEXT_MAIN}`}>{counts[k]}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Charge réelle des 7 prochains jours : barres, seuil de 8 h, info-bulle au survol / au toucher. */
function WeekChart({ overview }: { overview: InsightsOverview }) {
  const f = useInsightFormat();
  const { tr } = f;
  const [active, setActive] = useState<number | null>(null);
  const days = overview.days;
  const maxMin = Math.max(10 * 60, ...days.map((d) => d.occupiedMinutes));
  const H = 132; // hauteur de la zone de tracé (px)
  const y = (m: number) => (m / maxMin) * H;
  const threshold = y(8 * 60);
  // Libellés directs sélectifs : uniquement les journées signalées et la plus chargée
  const peak = days.reduce((a, d, i) => (d.occupiedMinutes > (days[a]?.occupiedMinutes ?? -1) ? i : a), 0);
  const tip = active !== null ? days[active] : null;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className={`text-sm font-semibold ${TEXT_MAIN}`}>{tr("Charge des 7 prochains jours")}</p>
        <div className={`flex flex-wrap gap-x-3 gap-y-1 text-[11px] ${TEXT_SOFT}`}>
          {(["normal", "heavy", "conflict"] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-sm ${STATE[k].bg}`} aria-hidden="true" />
              {tr(STATE[k].label)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative" onMouseLeave={() => setActive(null)}>
        {/* Seuil de 8 h (journée chargée) : repère discret */}
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#D6D1C6] dark:border-white/15" style={{ top: H + 18 - threshold }}>
          <span className={`absolute -top-[9px] left-0 bg-white pr-1 text-[10px] dark:bg-[#1A2332] ${TEXT_MUTED}`}>8 h</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="list" aria-label={tr("Charge des 7 prochains jours")}>
          {days.map((d, i) => {
            const s = f.shortDay(d.date);
            const h = d.occupiedMinutes > 0 ? Math.max(4, y(d.occupiedMinutes)) : 2;
            const label = d.state !== "normal" || (i === peak && d.occupiedMinutes > 0);
            return (
              <button
                key={d.date}
                type="button"
                role="listitem"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
                aria-label={`${f.day(d.date, false)} : ${f.duration(d.occupiedMinutes)} · ${tr(STATE[d.state].label)}`}
                className="group flex flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#214E3B]"
              >
                <div className="relative flex w-full items-end justify-center" style={{ height: H + 18 }}>
                  {label && (
                    <span className={`absolute text-[10px] font-semibold tabular-nums ${TEXT_SOFT}`} style={{ bottom: h + 3 }}>
                      {f.duration(d.occupiedMinutes)}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-[34px] rounded-t-[4px] transition-opacity ${
                      d.occupiedMinutes > 0 ? STATE[d.state].bg : "bg-[#E6E2D9] dark:bg-white/10"
                    } ${active !== null && active !== i ? "opacity-45" : ""}`}
                    style={{ height: h }}
                  />
                </div>
                <span className={`mt-1 border-t border-[#E6E2D9] pt-1 text-center text-[11px] leading-tight dark:border-[#2A3647] w-full ${i === 0 ? `font-bold ${TEXT_MAIN}` : TEXT_MUTED}`}>
                  {i === 0 ? tr("Auj.") : s.weekday}
                  <br />
                  <span className="tabular-nums">{s.day}</span>
                </span>
              </button>
            );
          })}
        </div>

        {tip && active !== null && (
          <div
            role="status"
            className={`pointer-events-none absolute top-0 z-10 w-max max-w-[200px] -translate-x-1/2 rounded-xl px-3 py-2 text-xs shadow-lg ${SURFACE}`}
            style={{ left: `${((active + 0.5) / 7) * 100}%` }}
          >
            <p className={`font-semibold first-letter:uppercase ${TEXT_MAIN}`}>{f.day(tip.date, false)}</p>
            <p className={TEXT_SOFT}>
              {tip.occupiedMinutes > 0 ? tr("{d} d'activités", { d: f.duration(tip.occupiedMinutes) }) : tr("Aucune activité")}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-sm ${STATE[tip.state].bg}`} aria-hidden="true" />
              <span className={TEXT_SOFT}>{tr(STATE[tip.state].label)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Bloc « Analyses » du tableau de bord : anneau des points, charge de la semaine, 3 points prioritaires. */
export function DashboardInsightsCard({ insights, overview, counts }: { insights: Insight[]; overview: InsightsOverview; counts: Counts }) {
  const f = useInsightFormat();
  const { tr } = f;
  const top = insights.filter((i) => i.level !== "insufficient");
  const toTreat = counts.urgent + counts.attention;
  // Une seule phrase : le conseil de la semaine, sinon le point le plus important, sinon « semaine équilibrée »
  const first = top[0];
  const insight = overview.advice
    ? tr(overview.advice.text, f.params(overview.advice.params))
    : first
      ? f.when(first)
        ? tr("En priorité : {title} ({when}).", { title: f.text(first).title, when: f.when(first)! })
        : tr("En priorité : {title}.", { title: f.text(first).title })
      : tr("Votre semaine est équilibrée : rien ne demande d'attention particulière.");
  return (
    <section className={`space-y-4 rounded-2xl p-4 sm:p-5 ${SURFACE}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#214E3B] dark:text-[#7FD1AE]">{tr("Analyses")}</h2>
          <p className={`mt-0.5 text-base font-semibold ${TEXT_MAIN}`}>
            {toTreat > 0 ? tr("{n} point(s) à traiter", { n: toTreat }) : tr("Rien d'urgent à traiter")}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-6">
        <Ring counts={counts} />
        <WeekChart overview={overview} />
      </div>

      {/* Interprétation en une phrase + accès à l'analyse complète (le détail des points vit sur la page Analyses) */}
      <div className="flex flex-col gap-3 rounded-xl bg-[#EEF3EF] p-3.5 dark:bg-[#16302A] sm:flex-row sm:items-center sm:gap-4">
        <p className="flex min-w-0 flex-1 gap-2.5 text-[13px] leading-relaxed text-[#1F3A2E] dark:text-[#E4EFE9]">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#214E3B] dark:text-[#7FD1AE]" aria-hidden="true" />
          <span>{insight}</span>
        </p>
        <Link
          href="/insights"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#214E3B] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F30] dark:bg-[#2F6B52] dark:hover:bg-[#357A5D]"
        >
          {tr("Voir l'analyse détaillée")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
