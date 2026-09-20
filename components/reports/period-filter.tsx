"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateTime } from "luxon";
import { Calendar } from "lucide-react";

export function PeriodFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const now = DateTime.now();
  const monthStart = now.startOf("month").toISODate()!;
  const monthEnd = now.endOf("month").toISODate()!;
  const quarterStart = now.startOf("quarter").toISODate()!;
  const quarterEnd = now.endOf("quarter").toISODate()!;
  const yearStart = now.startOf("year").toISODate()!;
  const yearEnd = now.endOf("year").toISODate()!;
  const last12Start = now.minus({ months: 12 }).startOf("month").toISODate()!;
  const last12End = now.endOf("month").toISODate()!;

  const isCurrentMonth = from === monthStart && to === monthEnd;
  const isCurrentQuarter = from === quarterStart && to === quarterEnd;
  const isCurrentYear = from === yearStart && to === yearEnd;
  const isLast12 = from === last12Start && to === last12End;

  // Calcul du nombre de mois couverts pour clarté
  const startDT = DateTime.fromISO(from);
  const endDT = DateTime.fromISO(to);
  const diffMonths = Math.max(1, Math.round(endDT.diff(startDT, "months").months) || 1);

  const periodLabel = isCurrentMonth
    ? `Ce mois-ci (${now.setLocale("fr").toFormat("MMMM yyyy")})`
    : isCurrentQuarter
    ? `Ce trimestre (${now.setLocale("fr").toFormat("qqq yyyy")} — 3 mois)`
    : isCurrentYear
    ? `Année en cours (${now.year} — 12 mois)`
    : `Période du ${startDT.toFormat("dd/MM/yyyy")} au ${endDT.toFormat("dd/MM/yyyy")} (~${diffMonths} mois)`;

  function applyPreset(preset: "month" | "quarter" | "year" | "last12") {
    let start = "";
    let end = "";

    if (preset === "month") {
      start = monthStart;
      end = monthEnd;
    } else if (preset === "quarter") {
      start = quarterStart;
      end = quarterEnd;
    } else if (preset === "year") {
      start = yearStart;
      end = yearEnd;
    } else if (preset === "last12") {
      start = last12Start;
      end = last12End;
    }

    setCustomFrom(start);
    setCustomTo(end);
    router.push(`/reports?from=${start}&to=${end}`);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/reports?from=${customFrom}&to=${customTo}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-canvas-raised p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Boutons presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="text-ink-500 mr-1 font-semibold">Période :</span>
          <button
            type="button"
            onClick={() => applyPreset("month")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              isCurrentMonth
                ? "bg-signal text-white font-bold shadow-sm"
                : "bg-ink-100 text-ink-700 hover:bg-ink-200"
            }`}
          >
            Ce mois-ci
          </button>
          <button
            type="button"
            onClick={() => applyPreset("quarter")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              isCurrentQuarter
                ? "bg-signal text-white font-bold shadow-sm"
                : "bg-ink-100 text-ink-700 hover:bg-ink-200"
            }`}
          >
            Ce trimestre
          </button>
          <button
            type="button"
            onClick={() => applyPreset("year")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              isCurrentYear
                ? "bg-signal text-white font-bold shadow-sm"
                : "bg-ink-100 text-ink-700 hover:bg-ink-200"
            }`}
          >
            Année en cours (YTD)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("last12")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              isLast12
                ? "bg-signal text-white font-bold shadow-sm"
                : "bg-ink-100 text-ink-700 hover:bg-ink-200"
            }`}
          >
            12 derniers mois
          </button>
        </div>

        {/* Formulaire dates personnalisées */}
        <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-ink-300 bg-canvas px-2.5 py-1.5 text-xs text-ink-950 focus:border-signal focus:outline-none"
          />
          <span className="text-xs text-ink-400 font-medium">au</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-ink-300 bg-canvas px-2.5 py-1.5 text-xs text-ink-950 focus:border-signal focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-ink-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ink-800 transition-colors"
          >
            Appliquer
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 text-xs text-ink-600 bg-canvas/70 px-3 py-1.5 rounded-lg border border-ink-100">
        <Calendar className="w-3.5 h-3.5 text-signal shrink-0" />
        <span>Rapport affiché : <strong className="text-ink-950 font-semibold">{periodLabel}</strong></span>
      </div>
    </div>
  );
}
