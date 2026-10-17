"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import type { MonthlySummaryItem } from "@/lib/reports/profitability";

export function MonthlyEvolution({ items }: { items: MonthlySummaryItem[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<"all" | "expenses" | "income">("all");

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
    const currentIncomeVal = activeMode === "income" ? m.incomeReceived : m.income;
    const currentExpensesVal = activeMode === "expenses" ? m.expensesPaid : m.expenses;
    const yIncome = padTop + chartH * (1 - currentIncomeVal / maxVal);
    const yExpenses = padTop + chartH * (1 - currentExpensesVal / maxVal);
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
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-md">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <h3 className="font-extrabold text-zinc-950 dark:text-white text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-signal" />
          Évolution & Courbe Mensuelle
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 font-medium">
          {activeMode === "all"
            ? "Comparaison des courbes de flux : revenus vs dépenses"
            : activeMode === "income"
            ? "Affichage isolé de la courbe des revenus encaissés"
            : "Affichage isolé de la courbe des dépenses décaissées"}
        </p>
      </div>

      {/* Zone de commande centrée : Sélecteurs Dépenses & Revenus face à face */}
      <div className="flex items-center justify-center w-full py-1">
        <div className="inline-flex items-center justify-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/90 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs w-full sm:w-auto min-w-[280px] max-w-md">
          <button
            type="button"
            onClick={() => setActiveMode((prev) => (prev === "expenses" ? "all" : "expenses"))}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMode === "expenses"
                ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                : activeMode === "all"
                ? "bg-white/80 dark:bg-zinc-900/80 text-rose-600 dark:text-rose-400 shadow-2xs hover:bg-white dark:hover:bg-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
            }`}
          >
            <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Dépenses</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode((prev) => (prev === "income" ? "all" : "income"))}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMode === "income"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                : activeMode === "all"
                ? "bg-white/80 dark:bg-zinc-900/80 text-emerald-600 dark:text-emerald-400 shadow-2xs hover:bg-white dark:hover:bg-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Revenus</span>
          </button>
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

          {/* Gradient Area Fills conditionnels */}
          {activeMode !== "expenses" && incomeAreaPath && (
            <path d={incomeAreaPath} fill="url(#incomeGrad)" />
          )}
          {activeMode !== "income" && expensesAreaPath && (
            <path d={expensesAreaPath} fill="url(#expensesGrad)" />
          )}

          {/* Smoothed Stroke Lines conditionnelles */}
          {activeMode !== "expenses" && (
            <path
              d={incomeLinePath}
              fill="none"
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="filter drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]"
            />
          )}
          {activeMode !== "income" && (
            <path
              d={expensesLinePath}
              fill="none"
              stroke="#EF4444"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="filter drop-shadow-[0_2px_4px_rgba(239,68,68,0.3)]"
            />
          )}

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
                {activeMode !== "expenses" && (
                  <circle
                    cx={p.x}
                    cy={p.yIncome}
                    r={isHovered ? 6 : 4}
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    className="transition-all duration-200"
                  />
                )}

                {/* Expenses point */}
                {activeMode !== "income" && (
                  <circle
                    cx={p.x}
                    cy={p.yExpenses}
                    r={isHovered ? 6 : 4}
                    fill="#EF4444"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    className="transition-all duration-200"
                  />
                )}

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
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-canvas-raised border border-ink-200 dark:border-ink-800 text-xs shadow-xs">
            <span className="font-bold text-ink-950 dark:text-ink-50">
              Focus : {activeItem.monthLabel}
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-right">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-end gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {formatAmount(activeItem.incomeReceived, activeItem.currency)} encaissés
                </span>
                {activeItem.incomeExpected > 0 && (
                  <span className="text-[10.5px] text-ink-500 font-medium">
                    +{formatAmount(activeItem.incomeExpected, activeItem.currency)} attendus
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center justify-end gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {formatAmount(activeItem.expensesPaid, activeItem.currency)} payées
                </span>
                {activeItem.expensesPlanned > 0 && (
                  <span className="text-[10.5px] text-ink-500 font-medium">
                    +{formatAmount(activeItem.expensesPlanned, activeItem.currency)} prévues
                  </span>
                )}
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  activeItem.netReal >= 0
                    ? "bg-positive-soft text-positive border border-positive/30"
                    : "bg-danger-soft text-danger border border-danger/30"
                }`}
              >
                Solde réel : {formatAmount(activeItem.netReal, activeItem.currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Breakdown Table / Cards below curve */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
          Détail chiffré par mois (flux réels &amp; prévisions)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {items.map((m, idx) => {
            const isLoss = m.netReal < 0;
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
                  <span className={isLoss ? "text-danger font-black" : "text-positive font-black"}>
                    {isLoss ? "Déficit réel : " : "Solde réel : "}
                    {formatAmount(m.netReal, m.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-600 dark:text-ink-400">
                  <div>
                    Encaissé : <strong className="text-emerald-600 font-bold">{formatAmount(m.incomeReceived, m.currency)}</strong>
                    {m.incomeExpected > 0 && (
                      <span className="text-[10px] text-ink-500 block">+{formatAmount(m.incomeExpected, m.currency)} att.</span>
                    )}
                  </div>
                  <div className="text-right">
                    Payé : <strong className="text-rose-600 font-bold">{formatAmount(m.expensesPaid, m.currency)}</strong>
                    {m.expensesPlanned > 0 && (
                      <span className="text-[10px] text-ink-500 block">+{formatAmount(m.expensesPlanned, m.currency)} prév.</span>
                    )}
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

