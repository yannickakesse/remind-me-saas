"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DateTime } from "luxon";

export function PeriodFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function applyPreset(preset: "month" | "quarter" | "year" | "last12") {
    const now = DateTime.now();
    let start = "";
    let end = "";

    if (preset === "month") {
      start = now.startOf("month").toISODate()!;
      end = now.endOf("month").toISODate()!;
    } else if (preset === "quarter") {
      start = now.startOf("quarter").toISODate()!;
      end = now.endOf("quarter").toISODate()!;
    } else if (preset === "year") {
      start = now.startOf("year").toISODate()!;
      end = now.endOf("year").toISODate()!;
    } else if (preset === "last12") {
      start = now.minus({ months: 12 }).startOf("month").toISODate()!;
      end = now.endOf("month").toISODate()!;
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
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-xl border border-ink-200 bg-canvas-raised p-4">
      {/* Boutons presets */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="text-ink-500 mr-1">Raccourcis :</span>
        <button
          type="button"
          onClick={() => applyPreset("month")}
          className="rounded-lg bg-ink-100 px-3 py-1.5 text-ink-700 hover:bg-ink-200 transition-colors"
        >
          Ce mois-ci
        </button>
        <button
          type="button"
          onClick={() => applyPreset("quarter")}
          className="rounded-lg bg-ink-100 px-3 py-1.5 text-ink-700 hover:bg-ink-200 transition-colors"
        >
          Ce trimestre
        </button>
        <button
          type="button"
          onClick={() => applyPreset("year")}
          className="rounded-lg bg-signal-soft text-signal font-semibold px-3 py-1.5 hover:bg-signal-soft/80 transition-colors"
        >
          Année en cours (YTD)
        </button>
        <button
          type="button"
          onClick={() => applyPreset("last12")}
          className="rounded-lg bg-ink-100 px-3 py-1.5 text-ink-700 hover:bg-ink-200 transition-colors"
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
        <span className="text-xs text-ink-400">à</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="rounded-lg border border-ink-300 bg-canvas px-2.5 py-1.5 text-xs text-ink-950 focus:border-signal focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-signal px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-signal/90 transition-colors"
        >
          Filtrer
        </button>
      </form>
    </div>
  );
}
