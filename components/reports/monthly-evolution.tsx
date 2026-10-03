"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import type { MonthlySummaryItem } from "@/lib/reports/profitability";

export function MonthlyEvolution({ items }: { items: MonthlySummaryItem[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 dark:border-ink-800 bg-canvas-raised/50 p-6 text-center text-xs text-ink-500">
        Pas assez de données pour afficher l'évolution mensuelle.
      </div>
    );
  }

  const currency = items[0]?.currency ?? "XOF";
  const maxVal = Math.max(
    ...items.map((i) => Math.max(i.income, i.expenses, i.incomeReceived, i.expensesPaid)),
    100
  );

  // SVG Chart Geometry
  const width = 540;
  const height = 220;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = items.map((m, idx) => {
    const x =
      items.length === 1
        ? padLeft + chartW / 2
        : padLeft + (idx / (items.length - 1)) * chartW;
    const yIncome = padTop + chartH * (1 - m.income / maxVal);
    const yExpenses = padTop + chartH * (1 - m.expenses / maxVal);
    return { x, yIncome, yExpenses, data: m };
  });

  // Generate smooth cubic bezier SVG path
  function buildSmoothPath(pts: Array<{ x: number; y: number }>) {
    if (pts.length === 0) return "";
    const pFirst = pts[0];
    if (!pFirst) return "";
    if (pts.length === 1) return `M ${pFirst.x} ${pFirst.y}`;

    let path = `M ${pFirst.x} ${pFirst.y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = (i > 0 ? pts[i - 1] : pts[i]) ?? pts[i]!;
      const p1 = pts[i]!;
      const p2 = pts[i + 1]!;
      const p3 = (i !== pts.length - 2 ? pts[i + 2] : p2) ?? p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }

  const incomeLinePath = buildSmoothPath(points.map((p) => ({ x: p.x, y: p.yIncome })));
  const expensesLinePath = buildSmoothPath(points.map((p) => ({ x: p.x, y: p.yExpenses })));

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const baseY = padTop + chartH;

  const incomeAreaPath =
    points.length > 1 && firstPoint && lastPoint
      ? `${incomeLinePath} L ${lastPoint.x} ${baseY} L ${firstPoint.x} ${baseY} Z`
      : "";
  const expensesAreaPath =
    points.length > 1 && firstPoint && lastPoint
      ? `${expensesLinePath} L ${lastPoint.x} ${baseY} L ${firstPoint.x} ${baseY} Z`
      : "";

  const activeItem =
    hoveredIdx !== null ? items[hoveredIdx] : (items[items.length - 1] ?? items[0]);

  return (
    <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-canvas-raised p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-100 dark:border-ink-800/80 pb-3.5">
        <div>
          <h3 className="font-bold text-ink-950 dark:text-ink-50 text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-signal" />
            Évolution & Courbe Mensuelle
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            Suivi visuel des courbes de revenus vs dépenses
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs shrink-0 bg-canvas dark:bg-ink-900/60 px-3 py-1.5 rounded-xl border border-ink-100 dark:border-ink-800">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-emerald-500" />
            <span className="font-semibold text-ink-700 dark:text-ink-300">Revenus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-rose-500" />
            <span className="font-semibold text-ink-700 dark:text-ink-300">Dépenses</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Curve Chart */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-canvas/60 dark:bg-ink-950/40 p-2 sm:p-4 border border-ink-100 dark:border-ink-800/60">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + chartH * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-ink-200/60 dark:text-ink-800/60"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-ink-400 text-[9px] font-medium"
                >
                  {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Gradient Area Fills */}
          {incomeAreaPath && <path d={incomeAreaPath} fill="url(#incomeGrad)" />}
          {expensesAreaPath && <path d={expensesAreaPath} fill="url(#expensesGrad)" />}

          {/* Smoothed Stroke Lines */}
          <path
            d={incomeLinePath}
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]"
          />
          <path
            d={expensesLinePath}
            fill="none"
            stroke="#EF4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter drop-shadow-[0_2px_4px_rgba(239,68,68,0.3)]"
          />

          {/* Points & Vertical Guides */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={idx}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={padTop}
                    x2={p.x}
                    y2={baseY}
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                )}

                {/* Income point */}
                <circle
                  cx={p.x}
                  cy={p.yIncome}
                  r={isHovered ? 6 : 4}
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="transition-all duration-200"
                />

                {/* Expenses point */}
                <circle
                  cx={p.x}
                  cy={p.yExpenses}
                  r={isHovered ? 6 : 4}
                  fill="#EF4444"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="transition-all duration-200"
                />

                {/* X Axis Month Label */}
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  className={`text-[10px] transition-colors ${
                    isHovered
                      ? "fill-signal font-bold"
                      : "fill-ink-500 font-medium"
                  }`}
                >
                  {p.data.monthLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip / Focus Card */}
        {activeItem && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-canvas-raised border border-ink-200 dark:border-ink-800 text-xs">
            <span className="font-bold text-ink-950 dark:text-ink-50">
              Focus : {activeItem.monthLabel}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {formatAmount(activeItem.income, activeItem.currency)}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {formatAmount(activeItem.expenses, activeItem.currency)}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                  activeItem.net >= 0
                    ? "bg-positive-soft text-positive"
                    : "bg-danger-soft text-danger"
                }`}
              >
                Net : {formatAmount(activeItem.net, activeItem.currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Breakdown Table / Cards below curve */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
          Détail chiffré par mois
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {items.map((m, idx) => {
            const isLoss = m.net < 0;
            return (
              <div
                key={`${m.monthKey}-${idx}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  hoveredIdx === idx
                    ? "border-signal bg-signal-soft/20 shadow-xs scale-[1.01]"
                    : "border-ink-200 dark:border-ink-800 bg-canvas/40 hover:bg-canvas"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-ink-950 dark:text-ink-50">{m.monthLabel}</span>
                  <span className={isLoss ? "text-danger" : "text-positive"}>
                    {isLoss ? "Déficit : " : "Bénéfice : "}
                    {formatAmount(m.net, m.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-600 dark:text-ink-400">
                  <div>
                    Revenus : <strong className="text-emerald-600">{formatAmount(m.income, m.currency)}</strong>
                  </div>
                  <div className="text-right">
                    Dépenses : <strong className="text-rose-600">{formatAmount(m.expenses, m.currency)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

