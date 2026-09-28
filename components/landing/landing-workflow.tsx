"use client";

import { useLanguage } from "@/components/i18n/language-provider";

export function LandingWorkflow() {
  const { t } = useLanguage();

  const steps = [
    {
      time: "08:30",
      tag: t("workflow.s1_tag"),
      title: t("workflow.s1_title"),
      description: t("workflow.s1_desc"),
      highlight: t("workflow.s1_hl"),
    },
    {
      time: "11:15",
      tag: t("workflow.s2_tag"),
      title: t("workflow.s2_title"),
      description: t("workflow.s2_desc"),
      highlight: t("workflow.s2_hl"),
    },
    {
      time: "15:45",
      tag: t("workflow.s3_tag"),
      title: t("workflow.s3_title"),
      description: t("workflow.s3_desc"),
      highlight: t("workflow.s3_hl"),
    },
    {
      time: "19:00",
      tag: t("workflow.s4_tag"),
      title: t("workflow.s4_title"),
      description: t("workflow.s4_desc"),
      highlight: t("workflow.s4_hl"),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-canvas-raised border-y border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            {t("workflow.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            {t("workflow.title")}
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            {t("workflow.subtitle")}
          </p>
        </div>

        {/* Vertical Connected Timeline */}
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute top-6 bottom-6 left-4 sm:left-1/2 -translate-x-1/2 w-0.5 bg-ink-100 hidden sm:block" />

          <div className="space-y-12">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col sm:flex-row items-start ${
                  idx % 2 === 0 ? "sm:flex-row-reverse" : ""
                } gap-6 sm:gap-12`}
              >
                {/* Center Time Node */}
                <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-canvas border-2 border-signal items-center justify-center text-xs font-mono font-bold text-signal z-10 shadow-sm">
                  {idx + 1}
                </div>

                {/* Content Box */}
                <div className="w-full sm:w-1/2 p-6 rounded-2xl bg-canvas border border-ink-100 shadow-sm hover:border-signal/30 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-signal bg-signal-soft px-2.5 py-1 rounded-md">
                      {step.time} • {step.tag}
                    </span>
                    <span className="text-xs font-semibold text-positive">
                      {step.highlight}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-ink-950">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
