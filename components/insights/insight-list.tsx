"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronRight, Lightbulb, Lock, Sparkles, TrendingUp } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { DayLoad, Insight, InsightLevel } from "@/lib/intelligence/rules";
import { msg } from "@/lib/i18n/catalog";

/* ------------------------------------------------------------------ */
/* Mise en forme selon la langue : dates, mois, durées, montants       */
/* ------------------------------------------------------------------ */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function useInsightFormat() {
  const { tr, locale } = useLanguage();
  const day = (iso: string, withYear = true) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) }).format(new Date(y!, m! - 1, d!));
  };
  const month = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(y!, m! - 1, 1));
  };
  const shortDay = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y!, m! - 1, d!);
    return { weekday: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date), day: d! };
  };
  const duration = (minutes: number) => {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return locale === "fr" ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h ${m} min`;
  };
  const number = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);

  /** Paramètres mis en forme : dates en clair, durées, grands nombres, catégories traduites. */
  const params = (raw: Record<string, string | number>) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.endsWith("Min") && typeof v === "number") out[k] = duration(v);
      else if (typeof v === "string" && ISO_DAY.test(v)) out[k] = day(v, false);
      else if (typeof v === "string" && ISO_MONTH.test(v)) out[k] = month(v);
      else if (typeof v === "number" && (Math.abs(v) >= 1000 || !Number.isInteger(v))) out[k] = number(v);
      else if (k === "category" && typeof v === "string") out[k] = tr(v);
      else out[k] = v;
    }
    return out;
  };

  const text = (insight: Insight) => {
    const p = params(insight.params);
    return {
      title: tr(insight.title, p),
      detail: tr(insight.detail, p),
      recommendation: insight.recommendation ? tr(insight.recommendation, p) : null,
      params: p,
    };
  };

  /** Période affichée en tête de carte : « Mercredi 18 novembre 2026 », « Novembre 2026 ». */
  const when = (insight: Insight) => {
    if (!insight.when) return null;
    if (ISO_DAY.test(insight.when)) return cap(day(insight.when));
    if (ISO_MONTH.test(insight.when)) return cap(month(insight.when));
    return null;
  };

  return { tr, locale, day, month, shortDay, duration, number, params, text, when };
}

/* ------------------------------------------------------------------ */
/* Styles partagés                                                      */
/* ------------------------------------------------------------------ */

export const SURFACE = "bg-white dark:bg-[#1A2332] border border-[#E6E2D9] dark:border-[#2A3647]";
export const TEXT_MAIN = "text-[#17211D] dark:text-[#F3F1EC]";
export const TEXT_SOFT = "text-[#4A524D] dark:text-[#B7C0CC]";
export const TEXT_MUTED = "text-[#6B716D] dark:text-[#8E99A8]";
const TILE = "bg-[#F7F6F2] dark:bg-[#111822]";
const ADVICE = "bg-[#EEF3EF] text-[#1F3A2E] dark:bg-[#16302A] dark:text-[#E4EFE9]";
const BTN_PRIMARY = "bg-[#214E3B] hover:bg-[#1A3F30] text-white dark:bg-[#2F6B52] dark:hover:bg-[#357A5D]";
const BTN_OUTLINE = "border border-[#CFDDD3] dark:border-[#2F4A40] text-[#214E3B] dark:text-[#7FD1AE] hover:bg-[#EEF3EF] dark:hover:bg-[#16302A]";
const BTN_GHOST = "border border-[#E6E2D9] dark:border-[#2A3647] text-[#17211D] dark:text-[#F3F1EC] hover:bg-[#F7F6F2] dark:hover:bg-[#111822]";

export const LEVEL: Record<InsightLevel, { label: string; pill: string; dot: string }> = {
  urgent: {
    label: msg("Urgent"),
    pill: "bg-[#FDECEA] text-[#B42318] dark:bg-[#F28B82]/15 dark:text-[#F7A39B]",
    dot: "bg-[#B42318] dark:bg-[#F28B82]",
  },
  attention: {
    label: msg("À surveiller"),
    pill: "bg-[#FBEFD9] text-[#8A5A00] dark:bg-[#F2B84B]/15 dark:text-[#F2C46B]",
    dot: "bg-[#D99A24] dark:bg-[#F2B84B]",
  },
  info: {
    label: msg("Bon à savoir"),
    pill: "bg-[#E8F0F6] text-[#1E5A8A] dark:bg-[#8EC5EC]/15 dark:text-[#8EC5EC]",
    dot: "bg-[#9DB8C9] dark:bg-[#8EC5EC]",
  },
  insufficient: {
    label: msg("Données insuffisantes"),
    pill: "bg-[#F1EEE7] text-[#4A524D] dark:bg-white/10 dark:text-[#B7C0CC]",
    dot: "bg-[#B8B2A6]",
  },
};

export function LevelPill({ level }: { level: InsightLevel }) {
  const { tr } = useLanguage();
  const st = LEVEL[level];
  return (
    <span className={`inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-[11px] font-bold uppercase tracking-[0.04em] ${st.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden="true" />
      {tr(st.label)}
    </span>
  );
}

/** Libellé du bouton d'action : explicite selon la règle (« Ouvrir la journée », « Voir le budget »…). */
function actionLabel(insight: Insight): string {
  switch (insight.rule) {
    case "schedule_conflict":
    case "overloaded_day":
      return msg("Voir la journée");
    case "budget_burn":
      return msg("Voir le budget");
    case "income_trend":
      return msg("Voir les revenus");
    case "expense_trend":
      return msg("Voir les dépenses");
    case "savings_stale":
      return msg("Voir l'épargne");
    case "postponed_activity":
      return msg("Modifier l'activité");
    case "deadline_cluster":
      return msg("Voir les tâches");
    default:
      return insight.domain === "goals" ? msg("Voir l'objectif") : msg("Voir");
  }
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/* ------------------------------------------------------------------ */
/* Faits qui justifient l'alerte                                        */
/* ------------------------------------------------------------------ */

function Facts({ insight }: { insight: Insight }) {
  const f = useInsightFormat();
  const tr = f.tr;
  const t = f.text(insight);

  if (insight.rule === "schedule_conflict" && insight.day) {
    const involved = new Set(insight.day.overlaps.flatMap((o) => [o.a, o.b]));
    const rows = insight.day.events.filter((e) => involved.has(e.title)).slice(0, 4);
    return (
      <div className="space-y-1.5">
        <ul className={`space-y-1.5 text-[13px] sm:text-sm ${TEXT_MAIN}`}>
          {rows.map((e, i) => (
            <li key={`${e.title}-${e.start}-${i}`} className="flex gap-3">
              <span className={`w-[86px] shrink-0 font-mono text-xs leading-5 sm:w-24 ${TEXT_MUTED}`}>
                {e.start}–{e.end}
              </span>
              <span className="min-w-0 break-words">{e.title}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs font-semibold text-[#B42318] dark:text-[#F7A39B]">
          {tr("Chevauchement de {from} à {to} ({d})", { from: insight.day.overlaps[0]!.from, to: insight.day.overlaps[0]!.to, d: f.duration(insight.day.overlaps[0]!.minutes) })}
        </p>
      </div>
    );
  }

  if (insight.rule === "overloaded_day" && insight.day) {
    const d = insight.day;
    const tiles = [
      { label: tr("Activités"), value: String(d.count) },
      { label: tr("Temps occupé"), value: f.duration(d.occupiedMinutes) },
      { label: tr("Plus longue pause"), value: d.longestBreakMinutes === null ? tr("Aucune") : f.duration(d.longestBreakMinutes) },
    ];
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((x) => (
            <div key={x.label} className={`rounded-xl px-2.5 py-2 ${TILE}`}>
              <p className={`text-[11px] leading-tight ${TEXT_MUTED}`}>{x.label}</p>
              <p className={`mt-0.5 text-[15px] font-semibold tabular-nums ${TEXT_MAIN}`}>{x.value}</p>
            </div>
          ))}
        </div>
        {d.firstStart && d.lastEnd && (
          <p className={`text-xs ${TEXT_MUTED}`}>{tr("De {first} à {last}", { first: d.firstStart, last: d.lastEnd })}</p>
        )}
      </div>
    );
  }

  if (insight.rule === "budget_burn") {
    const percent = Math.min(100, Number(insight.params.percent) || 0);
    const over = insight.level === "urgent";
    return (
      <div className="space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#EFECE5] dark:bg-white/10">
          <div className={`h-full rounded-full ${over ? "bg-[#B42318] dark:bg-[#F28B82]" : "bg-[#D99A24] dark:bg-[#F2B84B]"}`} style={{ width: `${percent}%` }} />
        </div>
        <div className={`flex flex-wrap justify-between gap-x-3 text-xs ${TEXT_SOFT}`}>
          <span>
            <b className={TEXT_MAIN}>{t.params.spent}</b> / {t.params.limit} {t.params.currency}
          </span>
          <span>{tr("{n} jour(s) restant(s)", { n: insight.params.daysLeft ?? 0 })}</span>
        </div>
      </div>
    );
  }

  return <p className={`text-[13px] leading-relaxed sm:text-sm ${TEXT_SOFT}`}>{t.detail}</p>;
}

/* ------------------------------------------------------------------ */
/* Détail d'une journée : déroulé, pauses, chevauchements               */
/* ------------------------------------------------------------------ */

export function DayDetail({ day }: { day: DayLoad }) {
  const f = useInsightFormat();
  const tr = f.tr;
  const involved = new Set(day.overlaps.flatMap((o) => [o.a, o.b]));
  const longDay = day.occupiedMinutes >= 6 * 60;
  let maxEnd = -1;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: tr("Activités"), value: String(day.count) },
          { label: tr("Temps occupé"), value: f.duration(day.occupiedMinutes) },
          { label: tr("Amplitude"), value: day.firstStart && day.lastEnd ? `${day.firstStart}–${day.lastEnd}` : "—" },
        ].map((x) => (
          <div key={x.label} className={`rounded-xl px-2.5 py-2 ${TILE}`}>
            <p className={`text-[11px] leading-tight ${TEXT_MUTED}`}>{x.label}</p>
            <p className={`mt-0.5 text-sm font-semibold tabular-nums ${TEXT_MAIN}`}>{x.value}</p>
          </div>
        ))}
      </div>

      <ol className="space-y-1" aria-label={tr("Déroulé de la journée")}>
        {day.events.map((e, i) => {
          const s = toMin(e.start);
          const gap = maxEnd >= 0 ? s - maxEnd : 0;
          maxEnd = Math.max(maxEnd, toMin(e.end));
          const clash = involved.has(e.title);
          return (
            <li key={`${e.title}-${e.start}-${i}`}>
              {gap > 0 && (
                <p className={`py-1 pl-[56px] text-xs ${longDay && gap < 30 ? "text-[#8A5A00] dark:text-[#F2C46B]" : "text-[#0F7A52] dark:text-[#7FD1AE]"}`}>
                  {tr("Pause de {d}", { d: f.duration(gap) })}
                </p>
              )}
              <div
                className={`flex gap-3 rounded-xl px-2 py-2 ${
                  clash ? "border border-[#F3C2BD] bg-[#FDF3F2] dark:border-[#F28B82]/35 dark:bg-[#F28B82]/10" : ""
                }`}
              >
                <span className={`w-11 shrink-0 pt-0.5 font-mono text-xs ${clash ? "text-[#B42318] dark:text-[#F7A39B]" : TEXT_MUTED}`}>{e.start}</span>
                <div className="min-w-0 flex-1">
                  <p className={`break-words text-sm font-semibold ${TEXT_MAIN}`}>{e.title}</p>
                  <p className={`text-xs ${TEXT_MUTED}`}>
                    {e.start}–{e.end} · {f.duration(toMin(e.end) - s)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {day.overlaps.map((o, i) => (
        <p key={i} className="text-xs font-semibold text-[#B42318] dark:text-[#F7A39B]">
          {tr("Chevauchement de {from} à {to} ({d}) : « {a} » et « {b} »", { from: o.from, to: o.to, d: f.duration(o.minutes), a: o.a, b: o.b })}
        </p>
      ))}
      <p className={`text-xs leading-relaxed ${TEXT_MUTED}`}>
        {tr("Calcul fait à partir des horaires de vos séances : un chevauchement n'est compté qu'une fois dans le temps occupé.")}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Carte d'analyse                                                      */
/* ------------------------------------------------------------------ */

export function InsightCard({ insight, compact = false }: { insight: Insight; compact?: boolean }) {
  const f = useInsightFormat();
  const tr = f.tr;
  const [open, setOpen] = useState(false);
  const t = f.text(insight);
  const when = f.when(insight);

  // Tableau de bord : version compacte (niveau, période, titre, lien)
  if (compact) {
    const body = (
      <>
        <div className="flex items-center justify-between gap-2">
          <LevelPill level={insight.level} />
          {insight.link && <ChevronRight className={`h-4 w-4 shrink-0 ${TEXT_MUTED}`} aria-hidden="true" />}
        </div>
        <h3 className={`mt-2 text-sm font-semibold leading-snug ${TEXT_MAIN}`}>{t.title}</h3>
        {when && <p className={`mt-0.5 text-xs ${TEXT_MUTED}`}>{when}</p>}
      </>
    );
    return insight.link ? (
      <Link href={insight.link} className={`block rounded-2xl p-3.5 transition-colors hover:border-[#CFDDD3] dark:hover:border-[#2F4A40] ${SURFACE}`}>
        {body}
      </Link>
    ) : (
      <article className={`rounded-2xl p-3.5 ${SURFACE}`}>{body}</article>
    );
  }

  // « Bon à savoir » : une seule ligne, sans encombrer la liste
  if (insight.level === "info") {
    return (
      <article className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 ${SURFACE}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F4EE] dark:bg-[#7FD1AE]/15">
          <TrendingUp className="h-[18px] w-[18px] text-[#0F7A52] dark:text-[#7FD1AE]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#1E5A8A] dark:text-[#8EC5EC]">{tr(LEVEL.info.label)}</p>
          <p className={`text-sm font-semibold ${TEXT_MAIN}`}>{t.title}</p>
          <p className={`text-xs ${TEXT_SOFT}`}>{t.detail}</p>
        </div>
        {insight.link && (
          <Link
            href={insight.link}
            aria-label={tr(actionLabel(insight))}
            title={tr(actionLabel(insight))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#214E3B] hover:bg-[#EEF3EF] dark:text-[#7FD1AE] dark:hover:bg-[#16302A]"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </Link>
        )}
      </article>
    );
  }

  const primary = insight.level === "urgent";
  return (
    <article className={`rounded-2xl p-4 sm:p-5 ${SURFACE}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:gap-6">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 xl:justify-start">
            <LevelPill level={insight.level} />
            {when && <span className={`text-xs font-medium sm:text-[13px] ${TEXT_SOFT}`}>{when}</span>}
          </div>
          <h3 className={`text-base font-semibold leading-snug sm:text-lg ${TEXT_MAIN}`}>{t.title}</h3>
          <Facts insight={insight} />
          {t.recommendation && (
            <p className={`flex gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-relaxed sm:text-sm ${ADVICE}`}>
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#214E3B] dark:text-[#7FD1AE]" aria-hidden="true" />
              <span>{t.recommendation}</span>
            </p>
          )}
        </div>

        {(insight.link || insight.day) && (
          <div className="flex gap-2 xl:w-48 xl:shrink-0 xl:flex-col xl:justify-end">
            {insight.link && (
              <Link
                href={insight.link}
                className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors xl:flex-none ${primary ? BTN_PRIMARY : BTN_OUTLINE}`}
              >
                {tr(actionLabel(insight))} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            {insight.day && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={`inline-flex h-11 items-center justify-center gap-1 rounded-xl px-4 text-sm font-medium transition-colors ${BTN_GHOST}`}
              >
                {tr("Détails")}
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {open && insight.day && (
        <div className="mt-4 border-t border-[#E6E2D9] pt-4 dark:border-[#2A3647]">
          <DayDetail day={insight.day} />
        </div>
      )}
    </article>
  );
}

/** Aperçu pour les forfaits sans analyses : le nombre de constats, sans le détail. */
export function InsightsLocked({ counts }: { counts: { urgent: number; attention: number; info: number; total: number } }) {
  const { tr } = useLanguage();
  return (
    <div className={`mx-auto max-w-lg rounded-2xl p-6 text-center ${SURFACE}`}>
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF3EF] dark:bg-[#16302A]">
        <Lock className="h-5 w-5 text-[#214E3B] dark:text-[#7FD1AE]" aria-hidden="true" />
      </span>
      <p className={`mt-3 text-sm font-semibold ${TEXT_MAIN}`}>
        {counts.total > 0
          ? tr("Remind Me a repéré {n} point(s) à surveiller dans vos données", { n: counts.total })
          : tr("Remind Me analyse vos budgets, revenus, journées et objectifs")}
      </p>
      <p className={`mt-1 text-xs ${TEXT_SOFT}`}>{tr("Les analyses détaillées et leurs conseils sont inclus dans le forfait Pro (et pendant l'essai gratuit).")}</p>
      <Link href="/settings?tab=subscription" className={`mt-4 inline-flex h-11 items-center gap-1.5 rounded-xl px-5 text-sm font-semibold ${BTN_PRIMARY}`}>
        <Sparkles className="h-4 w-4" aria-hidden="true" /> {tr("Découvrir Pro")}
      </Link>
    </div>
  );
}
