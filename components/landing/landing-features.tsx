"use client";

import {
  LayoutDashboard,
  Layers,
  Wallet,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-canvas-raised border-t border-ink-200/60 dark:border-ink-800/60 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* SECTION 3 — En-tête : Fonctionnalité clé : montrer n’est pas seulement décrire */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            Fonctionnalité Clé
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 dark:text-white mt-4 tracking-tight font-sans">
            Fonctionnalité clé : montrer n’est pas seulement décrire.
          </h2>
          <p className="text-base sm:text-lg text-ink-600 dark:text-ink-300 mt-4 leading-relaxed">
            Chaque module de Remind Me a été pensé pour résoudre un problème concret rencontré par ceux qui mènent plusieurs vies professionnelles de front.
          </p>
        </div>

        <div className="space-y-10 sm:space-y-12">
          {/* SECTION 4 — Une vision centralisée dès la première seconde */}
          <div className="p-6 sm:p-10 rounded-3xl bg-canvas border border-ink-200/80 dark:border-ink-800 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Cockpit Quotidien</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-ink-950 dark:text-white">
                  Une vision centralisée dès la première seconde.
                </h3>
                <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                  Le cockpit est votre point de départ matinal. Il synthétise instantanément les priorités du jour, vos créneaux sans conflit, l&apos;état de vos encaissements et les tâches requérant une action immédiate.
                </p>
                <ul className="space-y-2 text-xs text-ink-700 dark:text-ink-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Statut de la journée analysé en direct</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Navigation fluide entre activités sans changer d&apos;espace</span>
                  </li>
                </ul>
              </div>

              {/* Représentation visuelle : Briefing du matin, créneaux, encaissements, tâches urgentes */}
              <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-ink-100 dark:border-ink-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-ink-950 dark:text-white">
                      Briefing du matin • 09:00
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-ink-500">
                    3 activités • 2 échéances proches
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-canvas border border-ink-100 dark:border-ink-800">
                    <div className="text-[11px] text-ink-500 font-medium">Créneaux & Rendez-vous</div>
                    <div className="text-lg font-bold text-ink-950 dark:text-white mt-1">2 créneaux</div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">0 conflit détecté</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-canvas border border-ink-100 dark:border-ink-800">
                    <div className="text-[11px] text-ink-500 font-medium">Encaissements à suivre</div>
                    <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">1 450 €</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">1 facture en attente</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-canvas border border-ink-100 dark:border-ink-800">
                    <div className="text-[11px] text-ink-500 font-medium">Tâches urgentes</div>
                    <div className="text-lg font-bold text-ink-950 dark:text-white mt-1">1 prioritaire</div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Report possible +7j</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                  <span className="text-amber-900 dark:text-amber-200">
                    ✦ Conseil du jour : Vos créneaux de l&apos;après-midi sont réservés pour la production.
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 shrink-0 ml-2">Planning protégé</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5 — Des activités bien organisées, des finances plus lisibles */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-ink-950 dark:text-white tracking-tight">
                Des activités bien organisées, des finances plus lisibles.
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 mt-2">
                Une séparation nette de vos casquettes professionnelles et une vision financière sans ambiguïté.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Volet Activités */}
              <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Pluriactivité structurée</span>
                  </div>
                  <h4 className="text-xl font-bold text-ink-950 dark:text-white">
                    Activités permanentes & temporaires
                  </h4>
                  <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                    Distinguez clairement vos mandats récurrents de vos missions ponctuelles avec dates de validité définies.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-xs font-bold text-ink-950 dark:text-white">Conseil & Stratégie</span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Permanente • En cours
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-500 font-mono">
                      <span>Taux horaire : 75 €/h</span>
                      <span>12 séances réalisées ce mois</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-xs font-bold text-ink-950 dark:text-white">Formation Executive 2026</span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        Temporaire
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-500 font-mono">
                      <span>Période : 01 Sep → 15 Déc 2026</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Taux forfaitaire</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Volet Finances */}
              <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Trésorerie & Rentabilité</span>
                  </div>
                  <h4 className="text-xl font-bold text-ink-950 dark:text-white">
                    Suivi clair des flux financiers
                  </h4>
                  <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                    Revenus encaissés, paiements en attente, charges fixes programmées et calcul automatique de votre rentabilité nette.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-ink-100 dark:border-ink-800">
                    <span className="text-ink-500">Flux d&apos;octobre</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+3 600 € net</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-canvas text-xs">
                      <span className="text-ink-700 dark:text-ink-300">Revenus encaissés</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">4 850 €</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-canvas text-xs">
                      <span className="text-ink-700 dark:text-ink-300">Factures en attente</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">1 250 € (2)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-canvas text-xs">
                      <span className="text-ink-700 dark:text-ink-300">Dépenses & charges programmées</span>
                      <span className="font-mono font-bold text-red-500">- 1 250 €</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between text-[11px] font-mono text-ink-500">
                    <span>Rentabilité calculée : <strong>64 €/h net</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Solde garanti</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
