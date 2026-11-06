"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateTime } from "luxon";
import { useLanguage } from "@/components/i18n/language-provider";

type Preset = "month" | "lastMonth" | "quarter" | "year" | "custom";

/** Sélecteur de période : pastilles défilantes sur mobile, formulaire dédié pour « Personnalisé ». */
export function PeriodFilter({ from, to, timezone }: { from: string; to: string; timezone?: string }) {
  const router = useRouter();
  const { tr } = useLanguage();
  const now = timezone ? DateTime.now().setZone(timezone) : DateTime.now();

  const ranges: Record<Exclude<Preset, "custom">, [string, string]> = {
    month: [now.startOf("month").toISODate()!, now.endOf("month").toISODate()!],
    lastMonth: [now.minus({ months: 1 }).startOf("month").toISODate()!, now.minus({ months: 1 }).endOf("month").toISODate()!],
    quarter: [now.startOf("quarter").toISODate()!, now.endOf("quarter").toISODate()!],
    year: [now.startOf("year").toISODate()!, now.endOf("year").toISODate()!],
  };
  const matched = (Object.keys(ranges) as Array<keyof typeof ranges>).find((k) => ranges[k][0] === from && ranges[k][1] === to);
  const [showCustom, setShowCustom] = useState(!matched);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const active: Preset = showCustom ? "custom" : matched ?? "custom";

  const chips: Array<{ key: Preset; label: string }> = [
    { key: "month", label: tr("Ce mois") },
    { key: "lastMonth", label: tr("Mois dernier") },
    { key: "quarter", label: tr("Trimestre") },
    { key: "year", label: tr("Année") },
    { key: "custom", label: tr("Personnalisé") },
  ];

  function choose(key: Preset) {
    if (key === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const [s, e] = ranges[key];
    setCustomFrom(s);
    setCustomTo(e);
    router.push(`/reports?from=${s}&to=${e}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    const [s, en] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    router.push(`/reports?from=${s}&to=${en}`);
  }

  return (
    <div className="space-y-2.5">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label={tr("Période")}>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={active === c.key}
            onClick={() => choose(c.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors min-h-[34px] ${
              active === c.key
                ? "bg-forest text-white shadow-sm"
                : "bg-ink-100/80 dark:bg-white/5 text-ink-700 dark:text-ink-200 hover:bg-ink-200/80 dark:hover:bg-white/10"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-white/10 bg-canvas dark:bg-slate-950 px-2.5 py-1.5 text-xs text-ink-500">
            {tr("Du")}
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="bg-transparent font-semibold text-ink-950 dark:text-white focus:outline-none" />
          </label>
          <label className="flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-white/10 bg-canvas dark:bg-slate-950 px-2.5 py-1.5 text-xs text-ink-500">
            {tr("au")}
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="bg-transparent font-semibold text-ink-950 dark:text-white focus:outline-none" />
          </label>
          <button type="submit" className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-hover">
            {tr("Afficher")}
          </button>
        </form>
      )}
    </div>
  );
}
