"use client";

import { Layers, CalendarCheck2, Wallet, Smartphone } from "lucide-react";

export function LandingBenefits() {
  const benefits = [
    {
      icon: Layers,
      title: "Pluriactivité unifiée",
      desc: "Conseil, formation, prestations ou créations : regroupez tous vos engagements, devises et clients dans un espace unique sans vous éparpiller.",
      tag: "Multi-rôles",
    },
    {
      icon: CalendarCheck2,
      title: "Zéro conflit d’agenda",
      desc: "Le calendrier intelligent analyse vos engagements en temps réel et prévient automatiquement les chevauchements d'horaires entre vos différentes activités.",
      tag: "Anticipation",
    },
    {
      icon: Wallet,
      title: "Trésorerie & rentabilité limpides",
      desc: "Suivez vos encaissements réels, les sommes attendues et vos charges programmées avec un calcul instantané de votre résultat net.",
      tag: "Clarté financière",
    },
    {
      icon: Smartphone,
      title: "Pensé pour le mobile & PWA",
      desc: "Une expérience rapide et agréable sur smartphone (iOS ou Android) comme sur ordinateur, avec synchronisation continue et fonctionnement fluide.",
      tag: "Mobilité totale",
    },
  ];

  return (
    <section id="benefits" className="py-20 sm:py-28 bg-[#F7F6F2] dark:bg-[#111822] border-t border-[#17211D]/8 dark:border-white/10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#17211D] border border-[#17211D]/10 dark:border-white/10 text-xs font-semibold text-[#17211D] dark:text-[#F7F6F2] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#214E3B]" />
            <span>Pourquoi Remind Me</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#17211D] dark:text-white tracking-tight font-sans">
            La sérénité d’un pilotage maîtrisé.
          </h2>

          <p className="text-base sm:text-lg text-[#17211D]/75 dark:text-ink-300 mt-3 leading-relaxed">
            Quatre principes fondamentaux pour remplacer le désordre des fichiers et applications fragmentés.
          </p>
        </div>

        {/* Grille 4 bénéfices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {benefits.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#17211D] border border-[#17211D]/8 dark:border-white/10 hover:border-[#214E3B]/40 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#214E3B]/10 dark:bg-[#214E3B]/20 text-[#214E3B] dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#17211D]/60 dark:text-ink-400 bg-[#F7F6F2] dark:bg-[#111822] px-2.5 py-1 rounded-full border border-[#17211D]/8">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#17211D] dark:text-white mb-2 group-hover:text-[#214E3B] dark:group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#17211D]/70 dark:text-ink-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
