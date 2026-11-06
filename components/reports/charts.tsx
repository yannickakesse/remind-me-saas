"use client";

/**
 * Graphiques SVG maison (aucune bibliothèque) : légers, vectoriels, imprimables, mode sombre.
 * Les infobulles réagissent au survol ET au toucher (un toucher sélectionne l'élément).
 * Règle : un mois sans données n'est jamais dessiné à zéro (trou dans la courbe).
 */
import { useEffect, useId, useRef, useState } from "react";
import { formatAmount } from "@/lib/finances/format";

/** Palette catégorielle validée (contraste, daltonisme, clair et sombre). Ordre fixe, jamais cyclé. */
export const CATEGORY_COLORS = ["#1F7A55", "#B87A10", "#3E6FB0", "#C2573A", "#7A5BA8", "#8A8F3C", "#A8506F"];
export const OTHER_COLOR = "#9CA3AF";
export const INCOME_COLOR = "#1F7A55";
export const EXPENSE_COLOR = "#C2573A";

/** Montant court pour les axes : 1,2 M · 350 k · 900 */
export function compactAmount(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (a >= 10_000) return `${sign}${Math.round(a / 1000).toLocaleString("fr-FR")} k`;
  if (a >= 1000) return `${sign}${(a / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
  return `${sign}${Math.round(a).toLocaleString("fr-FR")}`;
}

/** Graduations « rondes » entre 0 (ou un minimum négatif) et max. */
function niceTicks(min: number, max: number, count = 4): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi === lo) return [0];
  const raw = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = Math.floor(lo / step) * step; t <= hi + step * 0.001; t += step) ticks.push(Math.round(t * 100) / 100);
  if (ticks[ticks.length - 1]! < hi) ticks.push(ticks[ticks.length - 1]! + step);
  return ticks;
}

// ---------------------------------------------------------------------------
// Anneau
// ---------------------------------------------------------------------------

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  currency,
  centerLabel,
  size = 200,
}: {
  slices: DonutSlice[];
  currency: string;
  centerLabel: string;
  size?: number;
}) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = 80;
  const stroke = 26;
  const c = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 2.5 : 0; // séparation de 2 px entre segments
  let offset = 0;
  const current = slices.find((s) => s.key === active);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={centerLabel} className="max-w-full">
        <circle cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-ink-100 dark:text-white/5" />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * c;
            const dash = Math.max(len - gap, 0.5);
            const el = (
              <circle
                key={s.key}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={active === s.key ? stroke + 6 : stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 100 100)"
                className="cursor-pointer transition-[stroke-width,opacity] duration-150"
                opacity={active && active !== s.key ? 0.35 : 1}
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === s.key ? null : s.key)}
              >
                <title>{`${s.label} : ${formatAmount(s.value, currency)}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        <text x="100" y="92" textAnchor="middle" className="fill-ink-500 dark:fill-ink-400 text-[10px] font-semibold">
          {current ? current.label.slice(0, 22) : centerLabel}
        </text>
        <text x="100" y="114" textAnchor="middle" className="fill-ink-950 dark:fill-white text-[17px] font-extrabold tabular-nums">
          {compactAmount(current ? current.value : total)}
        </text>
        <text x="100" y="130" textAnchor="middle" className="fill-ink-500 dark:fill-ink-400 text-[9px] font-semibold">
          {current && total > 0 ? `${Math.round((current.value / total) * 100)} %` : currency}
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barres groupées : période actuelle contre période précédente
// ---------------------------------------------------------------------------

export interface BarGroup {
  label: string;
  income: number;
  expense: number;
}

export function GroupedBars({
  groups,
  currency,
  incomeLabel,
  expenseLabel,
}: {
  groups: BarGroup[];
  currency: string;
  incomeLabel: string;
  expenseLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const W = 320;
  const H = 180;
  const pad = { l: 40, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...groups.flatMap((g) => [g.income, g.expense]));
  const ticks = niceTicks(0, max);
  const top = ticks[ticks.length - 1]!;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const groupW = (W - pad.l - pad.r) / groups.length;
  const barW = Math.min(36, groupW / 3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${incomeLabel} / ${expenseLabel}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-ink-200 dark:stroke-white/10" strokeWidth="1" />
          <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="fill-ink-500 dark:fill-ink-400 text-[9px] tabular-nums">
            {compactAmount(t)}
          </text>
        </g>
      ))}
      {groups.map((g, i) => {
        const cx = pad.l + groupW * i + groupW / 2;
        const bars = [
          { k: `${i}-in`, v: g.income, color: INCOME_COLOR, x: cx - barW - 1, label: incomeLabel },
          { k: `${i}-out`, v: g.expense, color: EXPENSE_COLOR, x: cx + 1, label: expenseLabel },
        ];
        return (
          <g key={g.label}>
            {bars.map((b) => {
              const h = Math.max(0, y(0) - y(b.v));
              const rr = Math.min(4, h / 2, barW / 2);
              const top = y(0) - h;
              return (
                <g key={b.k} onMouseEnter={() => setActive(b.k)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === b.k ? null : b.k)} className="cursor-pointer">
                  {/* zone de clic plus grande que la barre */}
                  <rect x={b.x - 2} y={pad.t} width={barW + 4} height={y(0) - pad.t} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={`M${b.x},${y(0)} V${top + rr} Q${b.x},${top} ${b.x + rr},${top} H${b.x + barW - rr} Q${b.x + barW},${top} ${b.x + barW},${top + rr} V${y(0)} Z`}
                      fill={b.color}
                      opacity={active && active !== b.k ? 0.4 : 1}
                    />
                  )}
                  <title>{`${g.label} · ${b.label} : ${formatAmount(b.v, currency)}`}</title>
                  {active === b.k && (
                    <text x={b.x + barW / 2} y={Math.max(top - 5, 9)} textAnchor="middle" className="fill-ink-950 dark:fill-white text-[9px] font-bold tabular-nums">
                      {compactAmount(b.v)}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={cx} y={H - 10} textAnchor="middle" className="fill-ink-700 dark:fill-ink-300 text-[10px] font-semibold">
              {g.label}
            </text>
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="stroke-ink-400 dark:stroke-white/30" strokeWidth="1" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Courbe d'évolution (encaissé, payé, solde en pointillé) avec trous
// ---------------------------------------------------------------------------

export interface TrendPoint {
  key: string;
  label: string;
  /** Libellé complet pour l'infobulle (ex. « octobre 2026 »). */
  fullLabel?: string;
  income: number | null; // null = pas de données → trou
  expense: number | null;
  net: number | null;
  partial?: boolean;
}

export function TrendChart({
  points,
  currency,
  labels,
}: {
  points: TrendPoint[];
  currency: string;
  labels: { income: string; expense: string; net: string; partial: string; noData: string };
}) {
  const clipId = useId();
  const [active, setActive] = useState<number | null>(null);
  // Le dessin suit la largeur réelle : textes lisibles sur téléphone comme sur ordinateur
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 210 : 250;
  const pad = { l: W < 480 ? 38 : 46, r: 10, t: 16, b: 30 };
  const values = points.flatMap((p) => [p.income, p.expense, p.net]).filter((v): v is number => v !== null);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(1, ...values));
  const lo = ticks[0]!;
  const hi = ticks[ticks.length - 1]!;
  const n = points.length;
  const step = (W - pad.l - pad.r) / Math.max(1, n);
  const x = (i: number) => pad.l + step * i + step / 2;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo || 1));

  /** Segments continus : un mois sans données coupe la ligne. */
  const path = (get: (p: TrendPoint) => number | null) => {
    let d = "";
    let pen = false;
    points.forEach((p, i) => {
      const v = get(p);
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const series = [
    { k: "income", get: (p: TrendPoint) => p.income, color: INCOME_COLOR, dash: undefined as string | undefined, label: labels.income },
    { k: "expense", get: (p: TrendPoint) => p.expense, color: EXPENSE_COLOR, dash: undefined, label: labels.expense },
    { k: "net", get: (p: TrendPoint) => p.net, color: "currentColor", dash: "5 4", label: labels.net },
  ];
  const ap = active !== null ? points[active] : null;
  const tipLeft = active !== null ? (x(active) / W) * 100 : 0;

  return (
    <div className="relative" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-ink-700 dark:text-ink-200" role="img" aria-label={`${labels.income}, ${labels.expense}, ${labels.net}`}>
        <defs>
          <clipPath id={clipId}>
            <rect x={pad.l} y={0} width={W - pad.l - pad.r} height={H} />
          </clipPath>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-ink-400 dark:stroke-white/30" : "stroke-ink-200 dark:stroke-white/10"} strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="fill-ink-500 dark:fill-ink-400 text-[10px] tabular-nums">
              {compactAmount(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <g key={p.key}>
            {p.income === null && (
              <rect x={x(i) - step / 2 + 2} y={pad.t} width={step - 4} height={H - pad.t - pad.b} className="fill-ink-100/70 dark:fill-white/[0.03]" rx="4" />
            )}
            {active === i && <line x1={x(i)} x2={x(i)} y1={pad.t} y2={H - pad.b} className="stroke-ink-300 dark:stroke-white/20" strokeWidth="1" />}
            <text x={x(i)} y={H - 10} textAnchor="middle" className={`text-[10px] ${p.income === null ? "fill-ink-400 dark:fill-white/30" : "fill-ink-700 dark:fill-white/80 font-semibold"}`}>
              {p.label}
            </text>
          </g>
        ))}
        <g clipPath={`url(#${clipId})`}>
          {series.map((s) => (
            <path key={s.k} d={path(s.get)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {series.map((s) =>
            points.map((p, i) => {
              const v = s.get(p);
              if (v === null) return null;
              return (
                <circle
                  key={`${s.k}-${p.key}`}
                  cx={x(i)}
                  cy={y(v)}
                  r={active === i ? 4.5 : 3}
                  fill={s.k === "net" ? "currentColor" : s.color}
                  className="stroke-canvas-raised dark:stroke-slate-900"
                  strokeWidth="2"
                />
              );
            })
          )}
        </g>
        {/* Zones de survol / toucher, une par mois */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.key}`}
            x={x(i) - step / 2}
            y={0}
            width={step}
            height={H}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(active === i ? null : i)}
          />
        ))}
      </svg>
      {ap && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-max max-w-[260px] -translate-x-1/2 rounded-xl border border-ink-200 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/95 px-3 py-2 text-[11px] shadow-lg backdrop-blur"
          style={{ left: `${Math.min(Math.max(tipLeft, 30), 70)}%` }}
        >
          <p className="font-bold text-ink-950 dark:text-white capitalize">
            {ap.fullLabel ?? ap.label}
            {ap.partial && <span className="ml-1.5 font-semibold text-amber-600 dark:text-amber-400">· {labels.partial}</span>}
          </p>
          {ap.income === null ? (
            <p className="text-ink-500">{labels.noData}</p>
          ) : (
            <div className="mt-1 space-y-0.5 tabular-nums">
              {series.map((s) => (
                <p key={s.k} className="flex items-center justify-between gap-3 text-ink-700 dark:text-ink-200">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.k === "net" ? "currentColor" : s.color }} />
                    {s.label}
                  </span>
                  <span className="whitespace-nowrap font-semibold">{formatAmount(s.get(ap) ?? 0, currency)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barres horizontales divergentes : résultat net par activité
// ---------------------------------------------------------------------------

export interface HBarRow {
  key: string;
  label: string;
  value: number;
  color: string | null;
  muted?: boolean;
}

export function DivergingBars({ rows, currency }: { rows: HBarRow[]; currency: string }) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const hasNeg = rows.some((r) => r.value < 0);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = (Math.abs(r.value) / maxAbs) * (hasNeg ? 50 : 100);
        const neg = r.value < 0;
        return (
          <li key={r.key} className={r.muted ? "opacity-75" : undefined}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-ink-800 dark:text-ink-100">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: r.color ?? OTHER_COLOR }} />
                <span className="truncate">{r.label}</span>
              </span>
              <span className={`shrink-0 font-bold tabular-nums ${neg ? "text-danger" : "text-ink-950 dark:text-white"}`}>{formatAmount(r.value, currency)}</span>
            </div>
            <div className="relative mt-1.5 h-2 rounded-full bg-ink-100 dark:bg-white/5">
              {hasNeg && <span className="absolute left-1/2 top-[-2px] h-3 w-px bg-ink-300 dark:bg-white/20" />}
              <span
                className="absolute top-0 h-2 rounded-full"
                style={{
                  width: `${pct}%`,
                  left: hasNeg ? (neg ? `${50 - pct}%` : "50%") : 0,
                  background: neg ? EXPENSE_COLOR : INCOME_COLOR,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
