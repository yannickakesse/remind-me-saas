"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function LandingPricing() {
  const [yearly, setYearly] = useState(true);
  const { t } = useLanguage();

  return (
    <section id="pricing" className="py-24 bg-canvas border-t border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3 py-1 rounded-full">
            {t("pricing.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink-950 mt-3 font-sans">
            {t("pricing.title")}
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4">
            {t("pricing.subtitle")}
          </p>

          {/* Toggle Mensuel / Annuel */}
          <div className="mt-8 inline-flex items-center gap-3 bg-canvas-raised p-1.5 rounded-full border border-ink-200">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !yearly ? "bg-ink-950 text-white shadow-xs" : "text-ink-600 hover:text-ink-950"
              }`}
            >
              {t("pricing.toggle_monthly")}
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                yearly ? "bg-ink-950 text-white shadow-xs" : "text-ink-600 hover:text-ink-950"
              }`}
            >
              <span>{t("pricing.toggle_yearly")}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-positive/20 text-positive font-bold">
                {t("pricing.discount_badge")}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Tier 1: Découverte / Free */}
          <div className="p-8 rounded-2xl bg-canvas border border-ink-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">{t("pricing.free_name")}</h3>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-ink-100 text-ink-700">
                  {t("pricing.free_badge")}
                </span>
              </div>
              <p className="text-xs text-ink-500">
                {t("pricing.free_desc")}
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-ink-950">{t("pricing.free_price")}</span>
                <span className="text-xs text-ink-500 font-medium">{t("pricing.free_period")}</span>
              </div>

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.free_f1")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.free_f2")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.free_f3")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.free_f4")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.free_f5")}</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3 px-4 rounded-full border border-ink-300 text-ink-950 font-semibold text-xs text-center hover:bg-ink-100 transition-colors tap-active"
            >
              {t("pricing.free_cta")}
            </Link>
          </div>

          {/* Tier 2: Pro (Featured) */}
          <div className="p-8 rounded-2xl bg-canvas-raised border-2 border-signal shadow-xl shadow-signal/10 flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-signal text-white text-[11px] font-bold tracking-wide uppercase shadow-sm">
              <Sparkles className="w-3 h-3 text-white" />
              {t("pricing.pro_badge_popular")}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">{t("pricing.pro_name")}</h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-signal-soft text-signal">
                  {t("pricing.pro_badge")}
                </span>
              </div>
              <p className="text-xs text-ink-500">
                {t("pricing.pro_desc")}
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-ink-950">
                  {yearly ? t("pricing.pro_price_yearly") : t("pricing.pro_price_monthly")}
                </span>
                <span className="text-xs text-ink-500 font-medium">{t("pricing.pro_period")}</span>
              </div>
              {yearly && (
                <span className="text-[11px] text-positive font-semibold">
                  {t("pricing.pro_billed_yearly")}
                </span>
              )}

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-950">
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.pro_f1")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.pro_f2")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.pro_f3")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.pro_f4")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>{t("pricing.pro_f5")}</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>{t("pricing.pro_f6")}</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.pro_f7")}</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3.5 px-4 rounded-full bg-signal text-white font-semibold text-xs text-center shadow-md shadow-signal/20 hover:bg-signal-dark hover:shadow-lg transition-all tap-active"
            >
              {t("pricing.pro_cta")}
            </Link>
          </div>

          {/* Tier 3: Premium */}
          <div className="p-8 rounded-2xl bg-canvas border border-ink-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">{t("pricing.premium_name")}</h3>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-gold-soft text-gold-dark font-bold">
                  {t("pricing.premium_badge")}
                </span>
              </div>
              <p className="text-xs text-ink-500">
                {t("pricing.premium_desc")}
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-ink-950">
                  {yearly ? t("pricing.premium_price_yearly") : t("pricing.premium_price_monthly")}
                </span>
                <span className="text-xs text-ink-500 font-medium">{t("pricing.premium_period")}</span>
              </div>
              {yearly && (
                <span className="text-[11px] text-positive font-semibold">
                  {t("pricing.premium_billed_yearly")}
                </span>
              )}

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>{t("pricing.premium_f1")}</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>{t("pricing.premium_f2")}</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>{t("pricing.premium_f3")}</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.premium_f4")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>{t("pricing.premium_f5")}</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>{t("pricing.premium_f6")}</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3 px-4 rounded-full border border-ink-300 text-ink-950 font-semibold text-xs text-center hover:bg-ink-100 transition-colors tap-active"
            >
              {t("pricing.premium_cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
