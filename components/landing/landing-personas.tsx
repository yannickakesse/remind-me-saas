"use client";

import { useLanguage } from "@/components/i18n/language-provider";

export function LandingPersonas() {
  const { t } = useLanguage();

  const personas = [
    {
      role: t("personas.p1_role"),
      badge: t("personas.p1_badge"),
      description: t("personas.p1_desc"),
      painPoint: t("personas.p1_pain"),
      solution: t("personas.p1_sol"),
      avatarBg: "from-signal to-info",
    },
    {
      role: t("personas.p2_role"),
      badge: t("personas.p2_badge"),
      description: t("personas.p2_desc"),
      painPoint: t("personas.p2_pain"),
      solution: t("personas.p2_sol"),
      avatarBg: "from-positive to-signal",
    },
    {
      role: t("personas.p3_role"),
      badge: t("personas.p3_badge"),
      description: t("personas.p3_desc"),
      painPoint: t("personas.p3_pain"),
      solution: t("personas.p3_sol"),
      avatarBg: "from-warning to-danger",
    },
    {
      role: t("personas.p4_role"),
      badge: t("personas.p4_badge"),
      description: t("personas.p4_desc"),
      painPoint: t("personas.p4_pain"),
      solution: t("personas.p4_sol"),
      avatarBg: "from-info to-positive",
    },
  ];

  return (
    <section id="personas" className="py-24 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            {t("personas.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            {t("personas.title")}
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            {t("personas.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {personas.map((persona, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-canvas-raised border border-ink-200/70 shadow-sm card-interactive space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-signal-soft text-signal">
                  {persona.badge}
                </span>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${persona.avatarBg} opacity-80`} />
              </div>

              <h3 className="text-lg font-bold text-ink-950">{persona.role}</h3>

              <p className="text-sm text-ink-700 leading-relaxed">
                {persona.description}
              </p>

              <div className="pt-3 border-t border-ink-100 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-danger">
                  <span className="font-bold">{t("personas.challenge_label")}</span>
                  <span>{persona.painPoint}</span>
                </div>
                <div className="flex items-start gap-2 text-positive">
                  <span className="font-bold">{t("personas.solution_label")}</span>
                  <span>{persona.solution}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
