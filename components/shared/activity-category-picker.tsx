"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, Search, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  ACTIVITY_SECTORS,
  UNSPECIFIED,
  buildActivityCategory,
  parseActivityCategory,
  searchActivityCategories,
} from "@/lib/activities/classification";

/**
 * Choix du domaine de l'activité en deux niveaux (secteur → type), avec recherche,
 * « Autre » (texte libre) et « Non précisé ». La valeur part dans le champ caché `category`.
 * Replié par défaut une fois choisi : une seule ligne dans le formulaire.
 */
export function ActivityCategoryPicker({ initialValue }: { initialValue?: string | null }) {
  const { tr } = useLanguage();
  const initial = useMemo(() => parseActivityCategory(initialValue), [initialValue]);

  const [sectorKey, setSectorKey] = useState<string | null>(
    initial.kind === "sector" ? initial.sector.key : initial.kind === "other" || initial.kind === "legacy" ? "other" : initial.kind === "unspecified" ? UNSPECIFIED : null
  );
  const [subKey, setSubKey] = useState<string | null>(initial.kind === "sector" ? initial.sub?.key ?? null : null);
  const [otherText, setOtherText] = useState(initial.kind === "other" || initial.kind === "legacy" ? initial.text : "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const value = buildActivityCategory(sectorKey, subKey, otherText) ?? "";
  const sector = ACTIVITY_SECTORS.find((s) => s.key === sectorKey) ?? null;
  const results = useMemo(() => searchActivityCategories(query), [query]);

  const summary = sector
    ? `${sector.icon} ${tr(sector.label)}${subKey ? ` · ${tr(sector.subs.find((s) => s.key === subKey)?.label ?? "")}` : ""}`
    : sectorKey === "other"
    ? `✏️ ${otherText || tr("Autre")}`
    : sectorKey === UNSPECIFIED
    ? tr("Non précisé")
    : null;

  const choose = (sKey: string | null, sbKey: string | null = null) => {
    setSectorKey(sKey);
    setSubKey(sbKey);
    setQuery("");
    if (sbKey || sKey === UNSPECIFIED) setOpen(false);
  };

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
      active
        ? "border-signal bg-signal text-white shadow-2xs"
        : "border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 text-ink-800 dark:text-ink-100 hover:border-signal/60"
    }`;

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="category" value={value} />

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3.5 py-2.5 text-left text-sm shadow-2xs hover:border-signal/60 transition-colors"
        >
          <span className={summary ? "font-semibold text-ink-950 dark:text-white truncate" : "text-ink-400"}>
            {summary ?? tr("Choisir un domaine (ex : Commerce, Religion, Santé…)")}
          </span>
          <span className="shrink-0 text-xs font-bold text-signal">{summary ? tr("Modifier") : tr("Choisir")}</span>
        </button>
      )}

      {open && (
        <div className="rounded-2xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 p-3 sm:p-4 shadow-xs flex flex-col gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr("Rechercher : mariage, culte, e-commerce…")}
              className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised dark:bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-ink-950 dark:text-white placeholder:text-ink-400 focus:border-signal focus:outline-none"
            />
          </div>

          {query.trim() ? (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {results.length === 0 && <p className="px-1 py-2 text-xs text-ink-500">{tr("Aucun résultat. Choisissez « Autre » pour le préciser vous-même.")}</p>}
              {results.map(({ sector: s, sub: sb }) => (
                <button
                  key={`${s.key}/${sb?.key ?? ""}`}
                  type="button"
                  onClick={() => choose(s.key, sb?.key ?? null)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-signal/10"
                >
                  <span>{s.icon}</span>
                  <span className="font-semibold text-ink-950 dark:text-white">{tr(sb ? sb.label : s.label)}</span>
                  {sb && <span className="truncate text-xs text-ink-500">· {tr(s.label)}</span>}
                </button>
              ))}
            </div>
          ) : !sector ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{tr("Domaine")}</p>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_SECTORS.map((s) => (
                  <button key={s.key} type="button" onClick={() => choose(s.key)} className={chip(sectorKey === s.key)}>
                    <span>{s.icon}</span>
                    {tr(s.label)}
                  </button>
                ))}
                <button type="button" onClick={() => choose("other")} className={chip(sectorKey === "other")}>✏️ {tr("Autre")}</button>
              </div>
              {sectorKey === "other" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={otherText}
                    maxLength={80}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder={tr("Précisez le domaine (ex : Club de lecture)")}
                    className="flex-1 rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised dark:bg-slate-950 px-3 py-2 text-sm text-ink-950 dark:text-white focus:border-signal focus:outline-none"
                  />
                  <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-signal px-3 text-sm font-bold text-white">
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => choose(null)} className="inline-flex items-center gap-1 text-xs font-bold text-signal">
                  <ChevronLeft className="h-3.5 w-3.5" /> {tr("Domaines")}
                </button>
                <span className="text-sm font-bold text-ink-950 dark:text-white">{sector.icon} {tr(sector.label)}</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{tr("Type d'activité (facultatif)")}</p>
              <div className="flex flex-wrap gap-2">
                {sector.subs.map((sb) => (
                  <button key={sb.key} type="button" onClick={() => choose(sector.key, sb.key)} className={chip(subKey === sb.key)}>
                    {tr(sb.label)}
                  </button>
                ))}
                <button type="button" onClick={() => { choose(sector.key, null); setOpen(false); }} className={chip(!subKey)}>
                  {tr("Sans précision")}
                </button>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={() => { setOpen(false); setQuery(""); }} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900 dark:hover:text-white">
              <X className="h-3.5 w-3.5" /> {tr("Fermer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
