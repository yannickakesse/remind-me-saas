"use client";

import { X, Check, Sparkles, AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function LandingComparison() {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-canvas-raised border-y border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3 py-1 rounded-full">
            {t("comparison.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink-950 mt-3 font-sans">
            {t("comparison.title")}
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4">
            {t("comparison.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chaos Side */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-danger/20 shadow-sm card-interactive relative overflow-hidden">
            <div className="absolute top-0 right-0 inline-flex items-center gap-1.5 px-4 py-1.5 bg-danger/10 text-danger font-semibold text-xs rounded-bl-xl border-l border-b border-danger/20">
              <AlertCircle className="w-3.5 h-3.5" />
              {t("comparison.before_badge")}
            </div>

            <h3 className="text-xl font-bold text-ink-950 mb-6 flex items-center gap-2">
              <span>{t("comparison.before_title")}</span>
            </h3>

            <ul className="space-y-4 text-sm text-ink-700">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <X className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.before_p1_title")} </strong>
                  {t("comparison.before_p1_desc")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <X className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.before_p2_title")} </strong>
                  {t("comparison.before_p2_desc")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <X className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.before_p3_title")} </strong>
                  {t("comparison.before_p3_desc")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <X className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.before_p4_title")} </strong>
                  {t("comparison.before_p4_desc")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <X className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.before_p5_title")} </strong>
                  {t("comparison.before_p5_desc")}
                </span>
              </li>
            </ul>
          </div>

          {/* Clarity Side */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas-raised border-2 border-signal/40 shadow-lg shadow-signal/5 card-interactive relative overflow-hidden">
            <div className="absolute top-0 right-0 inline-flex items-center gap-1.5 px-4 py-1.5 bg-signal text-white font-semibold text-xs rounded-bl-xl shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              {t("comparison.after_badge")}
            </div>

            <h3 className="text-xl font-bold text-ink-950 mb-6 flex items-center gap-2">
              <span>{t("comparison.after_title")}</span>
            </h3>

            <ul className="space-y-4 text-sm text-ink-950">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.after_p1_title")} </strong>
                  {t("comparison.after_p1_desc")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.after_p2_title")} </strong>
                  {t("comparison.after_p2_desc")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.after_p3_title")} </strong>
                  {t("comparison.after_p3_desc")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.after_p4_title")} </strong>
                  {t("comparison.after_p4_desc")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>
                  <strong>{t("comparison.after_p5_title")} </strong>
                  {t("comparison.after_p5_desc")}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
