"use client";

import { X, Check, ArrowRight, Layers, Calendar, CheckSquare, Wallet, BellRing } from "lucide-react";

export function LandingComparison() {
  const fragmentedTools = [
    {
      tool: "Calendrier séparé",
      flaw: "N'a aucune conscience de vos taux horaires ni de vos factures en attente.",
    },
    {
      tool: "Tableur financier statique",
      flaw: "Exige des ressaisies manuelles laborieuses et ne prévient jamais d'un impayé.",
    },
    {
      tool: "Listes de tâches isolées",
      flaw: "Déconnectées de vos créneaux réels, provoquant une surcharge mentale permanente.",
    },
    {
      tool: "Rappels dispersés sur téléphone",
      flaw: "Alertes répétitives non hiérarchisées qui sonnent pendant vos heures de repos.",
    },
  ];

  const unifiedSolutions = [
    {
      pillar: "Activités reliées",
      benefit: "Chaque tâche, créneau et paiement est rattaché à son activité et son tarif dédié.",
    },
    {
      pillar: "Agenda protecteur",
      benefit: "Détection préventive des collisions entre engagements pour préserver votre équilibre.",
    },
    {
      pillar: "Trésorerie dynamique",
      benefit: "Suivi net en temps réel : encaissé, en attente et charges prévues dans une même vue.",
    },
    {
      pillar: "Alertes contextuelles",
      benefit: "Échéancier intelligent (J-7, J-3, J-1) programmé dans le respect de vos heures calmes.",
    },
  ];

  return (
    <section id="comparison" className="py-20 sm:py-28 bg-canvas-raised border-y border-ink-200/60 dark:border-ink-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            Un seul espace, plus de clarté
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 dark:text-white mt-4 tracking-tight font-sans">
            Pourquoi réunir ce qui était dispersé ?
          </h2>
          <p className="text-base sm:text-lg text-ink-600 dark:text-ink-300 mt-4 leading-relaxed">
            Gérer plusieurs activités avec une constellation d&apos;outils indépendants épuise votre attention.
            Remind Me connecte naturellement vos engagements, votre temps et votre trésorerie.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Side 1: The Fragmented Stack */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-red-500/20 shadow-xs flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  Outils traditionnels dispersés
                </span>
                <span className="text-xs text-ink-400 font-mono">Fragmentation</span>
              </div>

              <h3 className="text-xl font-bold text-ink-950 dark:text-white mb-3">
                Le fardeau de la dispersion mentale
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mb-6">
                Passer son temps à synchroniser à la main des carnets, des calendriers et des feuilles de calcul.
              </p>

              <div className="space-y-4">
                {fragmentedTools.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
                    <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-ink-950 dark:text-white">{item.tool}</div>
                      <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{item.flaw}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-ink-100 dark:border-ink-800 text-xs text-red-600 dark:text-red-400 font-medium">
              Résultat : doubles réservations, factures oubliées et fatigue cognitive.
            </div>
          </div>

          {/* Side 2: The Unified Remind Me Architecture */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas border-2 border-amber-500/40 shadow-xl shadow-amber-500/5 flex flex-col justify-between space-y-6 relative">
            <div className="absolute top-0 right-0 inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-bl-2xl shadow-sm">
              L&apos;expérience Remind Me
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Centre de contrôle unifié
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-semibold">100% Connecté</span>
              </div>

              <h3 className="text-xl font-bold text-ink-950 dark:text-white mb-3">
                La sérénité d&apos;un écosystème cohérent
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mb-6">
                Toutes vos dimensions professionnelles communiquent sans couture dans une même interface.
              </p>

              <div className="space-y-4">
                {unifiedSolutions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-canvas-raised border border-amber-500/20">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-ink-950 dark:text-white">{item.pillar}</div>
                      <div className="text-xs text-ink-600 dark:text-ink-300 mt-0.5">{item.benefit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-ink-100 dark:border-ink-800 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between">
              <span>Résultat : vision nette, décisions rapides et esprit libre.</span>
              <span className="text-amber-600 dark:text-amber-400">Atelier Moderne →</span>
            </div>
          </div>
        </div>

        {/* Integrated Nexus Strip: Connecting the 5 Pillars */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-canvas border border-ink-200/70 dark:border-ink-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-semibold text-ink-800 dark:text-ink-200">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              Activités
            </span>
            <span className="text-ink-400">+</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Calendrier
            </span>
            <span className="text-ink-400">+</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              Tâches
            </span>
            <span className="text-ink-400">+</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
              Finances
            </span>
            <span className="text-ink-400">+</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
              <BellRing className="w-3.5 h-3.5 text-purple-500" />
              Rappels
            </span>
          </div>

          <div className="shrink-0">
            <span className="text-xs font-mono font-bold text-ink-950 dark:text-white px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              = Un seul cockpit souverain
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
