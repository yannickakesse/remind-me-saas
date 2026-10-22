"use client";

import { Layers, CalendarCheck2, Wallet, BellRing } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function LandingTrustBanner() {
  const { t } = useLanguage();

  const pillars = [
    {
      icon: Layers,
      title: "Pluriactivité unifiée",
      desc: "Activités permanentes ou temporaires, taux horaires et engagements réunis dans un seul espace.",
      tag: "Multi-rôles",
    },
    {
      icon: CalendarCheck2,
      title: "Calendrier sans collision",
      desc: "Détection préventive des chevauchements d'horaires entre tous vos engagements professionnels.",
      tag: "Zéro conflit",
    },
    {
      icon: Wallet,
      title: "Trésorerie en temps réel",
      desc: "Revenus encaissés, factures en attente et charges programmées avec calcul de rentabilité nette.",
      tag: "Clarté financière",
    },
    {
      icon: BellRing,
      title: "Alertes contextuelles",
      desc: "Rappels étagés (J-7, J-3, J-1, Jour J) configurés selon vos priorités et vos heures calmes.",
      tag: "Sérénité mentale",
    },
  ];

  return (
    <section className="relative py-12 sm:py-16 bg-canvas border-y border-ink-200/60 dark:border-ink-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Subtle section label */}
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 font-mono">
            Conçu pour les professionnels qui refusent le compromis entre rigueur et sérénité
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="group p-5 sm:p-6 rounded-2xl bg-canvas-raised border border-ink-200/70 dark:border-ink-800/80 hover:border-amber-500/40 dark:hover:border-amber-400/30 transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-canvas border border-ink-100 dark:border-ink-800 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-500 bg-canvas px-2 py-0.5 rounded-full border border-ink-100 dark:border-ink-800">
                    {pillar.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-ink-950 dark:text-white mb-1.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs text-ink-600 dark:text-ink-300 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
