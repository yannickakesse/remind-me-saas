"use client";

import { useLanguage } from "@/components/i18n/language-provider";

export function LandingTestimonials() {
  const { t } = useLanguage();

  const testimonials = [
    {
      name: t("testimonials.t1_name"),
      role: t("testimonials.t1_role"),
      content: t("testimonials.t1_quote"),
      rating: 5,
      avatar: "TB",
    },
    {
      name: t("testimonials.t2_name"),
      role: t("testimonials.t2_role"),
      content: t("testimonials.t2_quote"),
      rating: 5,
      avatar: "SM",
    },
    {
      name: t("testimonials.t3_name"),
      role: t("testimonials.t3_role"),
      content: t("testimonials.t3_quote"),
      rating: 5,
      avatar: "AD",
    },
  ];

  return (
    <section className="py-24 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            {t("testimonials.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            {t("testimonials.title")}
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            {t("testimonials.subtitle")}
          </p>
        </div>

        {/* Impact Numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16 text-center">
          <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
            <div className="text-3xl font-extrabold text-signal">{t("testimonials.stat1_value")}</div>
            <div className="text-xs text-ink-500 mt-1">{t("testimonials.stat1_label")}</div>
          </div>
          <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
            <div className="text-3xl font-extrabold text-positive">{t("testimonials.stat2_value")}</div>
            <div className="text-xs text-ink-500 mt-1">{t("testimonials.stat2_label")}</div>
          </div>
          <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
            <div className="text-3xl font-extrabold text-warning">{t("testimonials.stat3_value")}</div>
            <div className="text-xs text-ink-500 mt-1">{t("testimonials.stat3_label")}</div>
          </div>
          <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
            <div className="text-3xl font-extrabold text-ink-950">{t("testimonials.stat4_value")}</div>
            <div className="text-xs text-ink-500 mt-1">{t("testimonials.stat4_label")}</div>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((tItem, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl bg-canvas-raised border border-ink-200/70 shadow-sm card-interactive flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-warning">
                  {[...Array(tItem.rating)].map((_, i) => (
                    <span key={i} className="text-sm">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-ink-700 italic leading-relaxed">
                  &ldquo;{tItem.content}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-ink-100">
                <div className="w-10 h-10 rounded-full bg-signal text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {tItem.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink-950">{tItem.name}</div>
                  <div className="text-[11px] text-ink-500">{tItem.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
