"use client";

import Link from "next/link";
import { AlertOctagon, AlertTriangle, Info, HelpCircle, ArrowRight, Lock, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { Insight, InsightLevel } from "@/lib/intelligence/rules";

const STYLE: Record<InsightLevel, { icon: typeof Info; ring: string; iconColor: string; label: string }> = {
  urgent: { icon: AlertOctagon, ring: "border-danger/35 bg-danger/5", iconColor: "text-danger", label: "Urgent" },
  attention: { icon: AlertTriangle, ring: "border-warning/40 bg-warning/5", iconColor: "text-amber-600 dark:text-amber-400", label: "À surveiller" },
  info: { icon: Info, ring: "border-sky-500/30 bg-sky-500/5", iconColor: "text-sky-600 dark:text-sky-400", label: "Bon à savoir" },
  insufficient: { icon: HelpCircle, ring: "border-ink-200 dark:border-white/10 bg-canvas dark:bg-slate-950/40", iconColor: "text-ink-500", label: "Données insuffisantes" },
};

/** Traduit un constat : les modèles et certains paramètres (catégories) passent par tr(). */
function useInsightText() {
  const { tr } = useLanguage();
  return (insight: Insight) => {
    const params = { ...insight.params };
    if (typeof params.category === "string") params.category = tr(params.category);
    return {
      title: tr(insight.title, params),
      detail: tr(insight.detail, params),
      recommendation: insight.recommendation ? tr(insight.recommendation, params) : null,
    };
  };
}

export function InsightCard({ insight, compact = false }: { insight: Insight; compact?: boolean }) {
  const { tr } = useLanguage();
  const text = useInsightText()(insight);
  const st = STYLE[insight.level];
  const Icon = st.icon;
  return (
    <article className={`rounded-2xl border bg-canvas-raised/90 dark:bg-slate-900/85 p-4 backdrop-blur-md ${st.ring}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${st.iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${st.iconColor}`}>{tr(st.label)}</p>
          <h3 className="mt-0.5 text-sm font-bold text-ink-950 dark:text-white">{text.title}</h3>
          {!compact && <p className="mt-1 text-xs text-ink-700 dark:text-ink-300">{text.detail}</p>}
          {!compact && text.recommendation && (
            <p className="mt-2 rounded-xl bg-canvas-raised/80 dark:bg-white/5 p-2.5 text-xs text-ink-800 dark:text-ink-200">
              <span className="font-bold text-signal">{tr("Conseil :")}</span> {text.recommendation}
            </p>
          )}
          {insight.link && (
            <Link href={insight.link} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-signal hover:underline">
              {tr("Voir")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/** Aperçu pour les forfaits sans analyses : le nombre de constats, sans le détail. */
export function InsightsLocked({ counts }: { counts: { urgent: number; attention: number; info: number; total: number } }) {
  const { tr } = useLanguage();
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-white/60 dark:border-white/10 bg-canvas-raised/85 dark:bg-slate-900/85 p-6 text-center shadow-xl backdrop-blur-md">
      <Lock className="mx-auto h-6 w-6 text-signal" />
      <p className="mt-2 text-sm font-bold text-ink-950 dark:text-white">
        {counts.total > 0
          ? tr("Remind Me a repéré {n} point(s) à surveiller dans vos données", { n: counts.total })
          : tr("Remind Me analyse vos budgets, revenus, journées et objectifs")}
      </p>
      <p className="mt-1 text-xs text-ink-700 dark:text-ink-300">
        {tr("Les analyses détaillées et leurs conseils sont inclus dans le forfait Pro (et pendant l'essai gratuit).")}
      </p>
      <Link href="/settings?tab=subscription" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-xs font-bold text-white">
        <Sparkles className="h-3.5 w-3.5" /> {tr("Découvrir Pro")}
      </Link>
    </div>
  );
}
