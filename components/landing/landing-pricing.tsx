"use client";


import { useLanguage } from "@/components/i18n/language-provider";
import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles, Clock } from "lucide-react";
import { PLAN_ENTITLEMENTS, PLAN_COMING_SOON, yearlyDiscountPercent, type PlanType } from "@/lib/subscriptions/entitlements";
import { formatUsd, FIRST_MONTH_PRICE_USD } from "@/lib/subscriptions/pricing";
import { msg } from "@/lib/i18n/catalog";

// Mêmes forfaits, prix et droits que dans l'application (Paramètres → Abonnement) :
// tout est lu depuis PLAN_ENTITLEMENTS, la source unique des forfaits.
const PLANS: PlanType[] = ["free", "pro", "premium"];

const PLAN_TAGLINES: Record<PlanType, string> = {
  free: msg("Pour découvrir et démarrer"),
  pro: msg("Pour consultants et pluriactifs"),
  premium: msg("Pour aller plus loin, sans limite"),
};

function quota(max: number, unlimited: string, limited: (n: number) => React.ReactNode) {
  return max === Infinity ? <strong>{unlimited}</strong> : limited(max);
}

export function LandingPricing() {
  const { tr } = useLanguage();
  const [yearly, setYearly] = useState(false);
  const discount = yearlyDiscountPercent();

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-canvas border-t border-ink-200/60 dark:border-ink-800/60 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-18">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            {tr("Tarifs Transparents")}</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 dark:text-white mt-4 tracking-tight font-sans">
            {tr("Des forfaits clairs, sans surprise.")}</h2>
          <p className="text-base sm:text-lg text-ink-600 dark:text-ink-300 mt-3 leading-relaxed">
            {tr("Commencez gratuitement, puis évoluez selon l'ampleur de vos activités.")}</p>

          {/* Toggle Mensuel / Annuel */}
          <div className="mt-8 inline-flex items-center gap-1.5 bg-canvas-raised p-1.5 rounded-full border border-ink-200 dark:border-ink-800 shadow-xs">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !yearly
                  ? "bg-ink-950 dark:bg-white text-white dark:text-slate-950 shadow-sm"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              {tr("Facturation mensuelle")}</button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                yearly
                  ? "bg-ink-950 dark:bg-white text-white dark:text-slate-950 shadow-sm"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              <span>{tr("Annuelle")}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                -{discount}%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Cartes de forfaits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {PLANS.map((key) => {
            const p = PLAN_ENTITLEMENTS[key];
            const featured = key === "premium";
            const price =
              p.priceMonthly === 0
                ? formatUsd(0)
                : yearly
                ? formatUsd(Math.round(p.priceYearly / 12))
                : formatUsd(p.priceMonthly);
            // Offre de bienvenue (mensuel) : prix barré + premier mois réduit
            const intro = !yearly && FIRST_MONTH_PRICE_USD[key] > 0;

            const features: { ok: boolean; soon?: boolean; label: React.ReactNode }[] = [
              { ok: true, label: tr("Voix standard, guides vocaux et rappels") },
              { ok: true, label: quota(p.maxActivities, tr("Activités illimitées"), (n) => <>{tr("Jusqu'à")}{" "}<strong>{n}</strong> {tr("activités")}</>) },
              { ok: true, label: quota(p.maxClients, tr("Contacts & clients illimités"), (n) => <>{tr("Jusqu'à")}{" "}<strong>{n}</strong> {tr("contacts & clients")}</>) },
              { ok: true, label: quota(p.maxGoals, tr("Objectifs d'épargne illimités"), (n) => <>{tr("Jusqu'à")}{" "}<strong>{n}</strong> {tr("objectifs d'épargne")}</>) },
              { ok: true, label: quota(p.maxBudgets, tr("Budgets mensuels illimités"), (n) => <>{tr("Jusqu'à")}{" "}<strong>{n}</strong> {tr("budgets mensuels")}</>) },
              { ok: p.hourlyProfitability, label: tr("Rapports de rentabilité horaire") },
              { ok: p.smartInsights, label: tr("Analyses intelligentes (budgets, tendances, objectifs)") },
              { ok: p.multiCurrency, label: tr("Gestion multi-devises unifiée") },
              ...PLAN_COMING_SOON[key].map((label) => ({ ok: false, soon: true, label: tr(label) })),
            ];

            return (
              <div
                key={key}
                className={`p-7 sm:p-8 rounded-3xl flex flex-col justify-between space-y-8 relative ${
                  featured
                    ? "bg-canvas-raised border-2 border-amber-500 shadow-xl shadow-amber-500/10"
                    : "bg-canvas border border-ink-200/80 dark:border-ink-800 shadow-sm"
                }`}
              >
                {featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold tracking-wide uppercase shadow-sm">
                    <Sparkles className="w-3 h-3 text-slate-950" />
                    {tr("Recommandé")}</div>
                )}

                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-ink-950 dark:text-white">{tr(p.planName)}</h3>
                      <p className="text-xs text-ink-500 mt-0.5">{tr(PLAN_TAGLINES[key])}</p>
                    </div>
                    {intro && (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                        {tr("1er mois à {amount}", { amount: formatUsd(FIRST_MONTH_PRICE_USD[key]) })}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      {intro && (
                        <span className="text-2xl sm:text-3xl font-bold font-mono text-ink-400 line-through decoration-2">{price}</span>
                      )}
                      <span className="text-4xl sm:text-5xl font-extrabold font-mono text-ink-950 dark:text-white">{intro ? formatUsd(FIRST_MONTH_PRICE_USD[key]) : price}</span>
                      <span className="text-xs text-ink-500 -ml-1">{tr("/ mois")}</span>
                    </div>
                    {intro ? (
                      <p className="text-[11px] text-ink-500 font-medium mt-1">{tr("Puis {amount} / mois", { amount: price })}</p>
                    ) : yearly && p.priceYearly > 0 ? (
                      <p className="text-[11px] text-ink-500 font-medium mt-1">{tr("Facturé {amount} par an", { amount: formatUsd(p.priceYearly) })}</p>
                    ) : p.priceMonthly === 0 ? (
                      <p className="text-[11px] text-ink-500 font-medium mt-1">{tr("Sans engagement")}</p>
                    ) : null}
                  </div>

                  <ul className="space-y-3 pt-6 border-t border-ink-200/80 dark:border-ink-800 text-xs">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        {f.ok ? (
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                        ) : f.soon ? (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-ink-300 shrink-0" />
                        )}
                        <span className={f.ok ? "text-ink-900 dark:text-ink-100" : f.soon ? "text-ink-600 dark:text-ink-300" : "text-ink-400"}>{f.label}</span>
                        {f.soon && (
                          <span className="ml-auto shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">{tr("Bientôt")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className={`w-full py-3.5 px-4 rounded-full text-xs text-center transition-all ${
                    featured
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 hover:shadow-lg"
                      : "border border-ink-300 dark:border-ink-700 text-ink-950 dark:text-white font-semibold hover:bg-ink-100 dark:hover:bg-ink-800"
                  }`}
                >
                  {key === "free" ? tr("Commencer gratuitement") : tr("Choisir le forfait {v0}", { v0: tr(p.planName) })}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
