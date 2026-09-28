"use client";

import { useLanguage } from "@/components/i18n/language-provider";

export function LandingFeatures() {
  const { t } = useLanguage();

  const features = [
    {
      number: "01",
      title: t("features.f1_title"),
      description: t("features.f1_desc"),
      points: [t("features.f1_p1"), t("features.f1_p2"), t("features.f1_p3")],
      icon: (
        <svg className="w-6 h-6 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      number: "02",
      title: t("features.f2_title"),
      description: t("features.f2_desc"),
      points: [t("features.f2_p1"), t("features.f2_p2"), t("features.f2_p3")],
      icon: (
        <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      number: "03",
      title: t("features.f3_title"),
      description: t("features.f3_desc"),
      points: [t("features.f3_p1"), t("features.f3_p2"), t("features.f3_p3")],
      icon: (
        <svg className="w-6 h-6 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      number: "04",
      title: t("features.f4_title"),
      description: t("features.f4_desc"),
      points: [t("features.f4_p1"), t("features.f4_p2"), t("features.f4_p3")],
      icon: (
        <svg className="w-6 h-6 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="py-24 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            {t("features.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            {t("features.title_line1")} <br />
            <span className="text-signal">{t("features.title_line2")}</span>
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            {t("features.subtitle")}
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat) => (
            <div
              key={feat.number}
              className="p-8 rounded-3xl bg-canvas-raised border border-ink-200/70 shadow-sm card-interactive space-y-5 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-canvas flex items-center justify-center border border-ink-100 group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>
                <span className="font-mono text-xl font-bold text-ink-300 group-hover:text-signal transition-colors">
                  {feat.number}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-ink-950 group-hover:text-signal transition-colors">
                  {feat.title}
                </h3>
                <p className="text-sm text-ink-700 mt-2 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <ul className="space-y-2.5 pt-2 border-t border-ink-100">
                {feat.points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-ink-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal shrink-0 mt-1.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
