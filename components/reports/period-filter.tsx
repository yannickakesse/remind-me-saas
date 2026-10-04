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
  const lastMonthStart = now.minus({ months: 1 }).startOf("month").toISODate()!;
  const lastMonthEnd = now.minus({ months: 1 }).endOf("month").toISODate()!;
  const quarterStart = now.startOf("quarter").toISODate()!;
  const quarterEnd = now.endOf("quarter").toISODate()!;
  const yearStart = now.startOf("year").toISODate()!;
  const yearEnd = now.endOf("year").toISODate()!;
  const last12Start = now.minus({ months: 12 }).startOf("month").toISODate()!;
  const last12End = now.endOf("month").toISODate()!;

  const isCurrentMonth = from === monthStart && to === monthEnd;
  const isLastMonth = from === lastMonthStart && to === lastMonthEnd;
  const isCurrentQuarter = from === quarterStart && to === quarterEnd;
  const isCurrentYear = from === yearStart && to === yearEnd;
  const isLast12 = from === last12Start && to === last12End;

  // Calcul du nombre de mois couverts pour clarté
  const startDT = DateTime.fromISO(from);
  const endDT = DateTime.fromISO(to);
  const diffMonths = Math.max(1, Math.round(endDT.diff(startDT, "months").months) || 1);

  const periodLabel = isCurrentMonth
    ? `Ce mois-ci (${now.setLocale("fr").toFormat("MMMM yyyy")})`
    : isLastMonth
    ? `Mois dernier (${now.minus({ months: 1 }).setLocale("fr").toFormat("MMMM yyyy")})`
    : isCurrentQuarter
    ? `Ce trimestre (${now.setLocale("fr").toFormat("qqq yyyy")} — 3 mois)`
    : isCurrentYear
    ? `Année en cours (${now.year} — 12 mois)`
    : `Période du ${startDT.toFormat("dd/MM/yyyy")} au ${endDT.toFormat("dd/MM/yyyy")} (~${diffMonths} mois)`;

  function applyPreset(preset: "month" | "year") {
    let start = "";
    let end = "";

    if (preset === "month") {
      start = monthStart;
      end = monthEnd;
    } else if (preset === "year") {
      start = yearStart;
      end = yearEnd;
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
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        {/* Presets essentiels & nets */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-zinc-600 dark:text-zinc-400 font-extrabold mr-1">Période :</span>
          <button
            type="button"
            onClick={() => applyPreset("month")}
            className={`rounded-xl px-4 py-2 transition-all active:scale-95 cursor-pointer min-h-[38px] font-black ${
              isCurrentMonth
                ? "bg-signal text-white shadow-sm ring-2 ring-signal/30"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Ce mois-ci
          </button>
          <button
            type="button"
            onClick={() => applyPreset("year")}
            className={`rounded-xl px-4 py-2 transition-all active:scale-95 cursor-pointer min-h-[38px] font-black ${
              isCurrentYear
                ? "bg-signal text-white shadow-sm ring-2 ring-signal/30"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Année {now.year}
          </button>
        </div>

        {/* Formulaire sélection dates sur-mesure */}
        <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-bold text-zinc-950 dark:text-white focus:outline-none"
            />
            <span className="text-xs text-zinc-400 font-bold">au</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-bold text-zinc-950 dark:text-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-signal hover:bg-signal-dark px-4 py-2.5 text-xs font-black text-white transition-all shadow-xs cursor-pointer active:scale-95"
          >
            Filtrer
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100/80 dark:bg-zinc-800/80 px-3.5 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
        <Calendar className="w-4 h-4 text-signal shrink-0" />
        <span>Rapport affiché : <strong className="text-zinc-950 dark:text-white font-black">{periodLabel}</strong></span>
      </div>
    </div>
  );
}
