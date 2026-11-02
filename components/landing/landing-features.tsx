"use client";

import {
  LayoutDashboard,
  Layers,
  Wallet,
} from "lucide-react";
import { LandingDashboardPreview } from "./landing-dashboard-preview";

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-canvas-raised border-t border-ink-200/60 dark:border-ink-800/60 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* SECTION 3 — En-tête : Fonctionnalité clé : montrer n’est pas seulement décrire */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 dark:text-white mt-4 tracking-tight font-sans">
            Conçu pour les pluriactifs.
          </h2>
          <p className="text-base sm:text-lg text-ink-600 dark:text-ink-300 mt-4 leading-relaxed">
            Chaque module de Remind Me a été pensé pour résoudre un problème concret rencontré par ceux qui mènent plusieurs vies professionnelles de front.
          </p>
        </div>

        <div className="space-y-10 sm:space-y-12">
          {/* SECTION 4 — Tableau de bord : reflète uniquement les blocs réels du dashboard
              (séances du jour, tâches urgentes, paiements en attente) */}
          <div className="p-4 sm:p-10 rounded-3xl bg-canvas border border-ink-200/80 dark:border-ink-800 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Tableau de bord</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-ink-950 dark:text-white">
                  Votre journée sur une seule page.
                </h3>
                <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                  Séances du jour, tâches urgentes, alertes à traiter et paiements en attente : l&apos;essentiel est réuni au même endroit.
                </p>
              </div>

              {/* Aperçu du vrai tableau de bord (mêmes composants que l'application) */}
              <div className="lg:col-span-7">
                <LandingDashboardPreview />
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
                  <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#1E3A5F" }} />
                      <span className="text-sm font-bold text-ink-950 dark:text-white mr-1">Cours particuliers</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 border-ink-200 dark:border-ink-700">Freelance</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Routine</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">35 000 XOF / mois</span>
                      <span className="text-ink-500">Permanente</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#D97706" }} />
                      <span className="text-sm font-bold text-ink-950 dark:text-white mr-1">Mission conseil</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 border-ink-200 dark:border-ink-700">Contrat</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30">Important</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Temporaire</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">150 000 XOF / mois</span>
                      <span className="text-ink-500">Fin : 31/05/2027</span>
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
                    Total reçu, paiements en attente, dépenses payées et solde net calculés automatiquement, avec la rentabilité par heure dans les Rapports.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-ink-200/80 dark:border-ink-800">
                    <span className="font-semibold text-ink-700 dark:text-ink-300">Solde net · mois en cours</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">178 000 XOF</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas text-xs">
                      <span className="text-ink-700 dark:text-ink-300">Total reçu</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">240 000 XOF</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas text-xs">
                      <span className="text-ink-700 dark:text-ink-300">Paiements en attente</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">85 000 XOF</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas text-xs">
                      <span className="text-ink-700 dark:text-ink-300">Dépenses payées</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">62 000 XOF</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs">
                    <span className="text-ink-700 dark:text-ink-300">
                      Rentabilité / heure <span className="ml-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Pro</span>
                    </span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">4 450 XOF / h</span>
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
