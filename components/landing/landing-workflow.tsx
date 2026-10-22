"use client";

import { UserPlus, Sliders, LayoutDashboard, ArrowRight } from "lucide-react";
import Link from "next/link";

export function LandingWorkflow() {
  const steps = [
    {
      num: "01",
      icon: UserPlus,
      title: "Créez votre compte en 2 minutes",
      subtitle: "Accès immédiat sans carte bancaire",
      desc: "Inscrivez-vous en quelques clics et accédez immédiatement à votre cockpit gratuit. Aucune carte bancaire requise pour démarrer.",
      highlight: "Prêt instantanément",
    },
    {
      num: "02",
      icon: Sliders,
      title: "Configurez vos activités & échéances",
      subtitle: "Permanentes ou temporaires",
      desc: "Définissez vos différentes casquettes professionnelles, vos taux horaires, vos dates de validité et vos charges récurrentes.",
      highlight: "Cadre structuré",
    },
    {
      num: "03",
      icon: LayoutDashboard,
      title: "Pilotez vos journées en toute clarté",
      subtitle: "Le cockpit quotidien",
      desc: "Chaque matin, ouvrez votre briefing : 0 conflit d'agenda, tâches hiérarchisées, alertes étagées et trésorerie nette calculée en direct.",
      highlight: "Sérénité totale",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-canvas-raised border-y border-ink-200/60 dark:border-ink-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            Comment ça marche
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 dark:text-white mt-4 tracking-tight font-sans">
            Trois étapes simples vers la sérénité.
          </h2>
          <p className="text-base sm:text-lg text-ink-600 dark:text-ink-300 mt-4 leading-relaxed">
            Pas de configuration fastidieuse de plusieurs semaines. Remind Me est opérationnel dès votre première session.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-canvas border border-ink-200/70 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-6 relative group hover:border-amber-500/40 transition-all duration-200"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-2xl font-black text-ink-200 dark:text-ink-800 group-hover:text-amber-500/40 transition-colors">
                      {step.num}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {step.subtitle}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-ink-950 dark:text-white mt-1">
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-ink-100 dark:border-ink-800/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ {step.highlight}
                  </span>
                  <span className="text-ink-400">Étape {idx + 1} / 3</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick CTA under Steps */}
        <div className="mt-14 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink-950 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            <span>Démarrer dès maintenant</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
