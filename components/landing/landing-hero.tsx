"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

export function LandingHero() {
  const [taskPostponed, setTaskPostponed] = useState(false);

  return (
    <section className="relative pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24 overflow-hidden bg-canvas">
      {/* Subtle Warm Atmospheric Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-b from-amber-100/40 via-amber-50/20 to-transparent dark:from-amber-950/20 dark:via-transparent blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Editorial Pill */}
        <div className="flex justify-center mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-canvas-raised border border-amber-500/30 dark:border-amber-400/20 shadow-xs backdrop-blur-xs text-xs font-semibold text-ink-900 dark:text-ink-100">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Votre organisation, en toute clarté</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-4xl mx-auto mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-extrabold tracking-tight text-ink-950 dark:text-white font-sans leading-[1.08]">
            Toutes vos activités.{" "}
            <span className="block sm:inline text-amber-600 dark:text-amber-400">
              Une vision plus claire.
            </span>
          </h1>
        </div>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-ink-700 dark:text-ink-300 max-w-2xl sm:max-w-3xl mx-auto text-center leading-relaxed mb-8 sm:mb-10 font-normal">
          Un espace intelligent pour organiser vos activités, maîtriser vos échéances,
          détecter les conflits d&apos;agenda et garder une vision limpide de vos finances.
          Sans éparpillement.
        </p>

        {/* Dual Actions Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10 sm:mb-12">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-150 tap-active group cursor-pointer"
          >
            <span>Commencer gratuitement</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:px-7 sm:py-4 rounded-full bg-canvas-raised border border-ink-200 dark:border-ink-800 text-ink-950 dark:text-white font-semibold text-sm sm:text-base hover:bg-ink-100 dark:hover:bg-ink-900 transition-colors tap-active shadow-xs cursor-pointer"
          >
            <span>Voir comment ça marche</span>
            <ChevronRight className="w-4 h-4 text-ink-400" />
          </a>
        </div>

        {/* Micro Trust Points (0 fake proof) */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 sm:gap-x-8 text-xs sm:text-sm text-ink-600 dark:text-ink-400 font-medium mb-14 sm:mb-16">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Sans carte bancaire requise</span>
          </div>
          <span className="hidden sm:inline text-ink-300 dark:text-ink-700">•</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Prêt en 2 minutes</span>
          </div>
          <span className="hidden sm:inline text-ink-300 dark:text-ink-700">•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Données isolées & chiffrées RLS</span>
          </div>
        </div>

        {/* The Realistic Product Demonstration Composition */}
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800 bg-canvas-raised shadow-2xl shadow-ink-950/10 overflow-hidden transition-all duration-300">
            {/* Window Top Bar */}
            <div className="bg-canvas border-b border-ink-100 dark:border-ink-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-xs font-mono text-ink-500 ml-2 hidden sm:inline-block">
                  app.remindme.io/cockpit
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Journée fluide • 0 conflit
                </span>
              </div>
            </div>

            {/* Inner Dashboard Cockpit Body */}
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-canvas">
              {/* Header inside Cockpit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink-100 dark:border-ink-800/60">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-ink-950 dark:text-white">
                    Bonjour, votre journée est sous contrôle
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-500 dark:text-ink-400">
                    3 activités actives • 1 créneau prioritaire aujourd&apos;hui
                  </p>
                </div>
                {/* Active Multi-Activities Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Conseil Stratégique (75€/h)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Formation Executive
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Projet Numérique
                  </span>
                </div>
              </div>

              {/* Three Financial Pulse Cards (IBM Plex Mono / Tabular figures) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800 shadow-xs">
                  <span className="text-xs text-ink-500 font-medium">Revenus perçus (mois en cours)</span>
                  <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                    4 850 €
                  </div>
                  <div className="text-[11px] text-ink-500 mt-1 flex items-center gap-1">
                    <span className="text-emerald-600 font-semibold">↑ +14%</span> vs mois précédent
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800 shadow-xs">
                  <span className="text-xs text-ink-500 font-medium">Dépenses & charges programmées</span>
                  <div className="text-2xl font-bold font-mono tracking-tight text-red-600 dark:text-red-400 mt-1">
                    1 250 €
                  </div>
                  <div className="text-[11px] text-ink-500 mt-1">
                    3 charges à venir ce mois-ci
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800 shadow-xs">
                  <span className="text-xs text-ink-500 font-medium">Trésorerie nette prévisionnelle</span>
                  <div className="text-2xl font-bold font-mono tracking-tight text-ink-950 dark:text-white mt-1">
                    +3 600 €
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                    Solde positif sécurisé
                  </div>
                </div>
              </div>

              {/* Next Event & Next Priority Task */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Upcoming Session */}
                <div className="p-4 sm:p-5 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800 flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Prochaine session
                      </span>
                      <span className="text-xs font-mono text-ink-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        14:00 - 15:30
                      </span>
                    </div>
                    <div className="text-sm font-bold text-ink-950 dark:text-white">
                      Revue de cadrage trimestriel • Client Tech
                    </div>
                    <div className="text-xs text-ink-500">
                      Activité : Conseil Stratégique (Taux : 75 €/h)
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    Zéro collision
                  </span>
                </div>

                {/* Priority Task with Live Interactive +7j action */}
                <div className="p-4 sm:p-5 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800 flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        Tâche prioritaire
                      </span>
                      <span className="text-xs text-ink-500">
                        {taskPostponed ? "Reportée au 31 Octobre" : "Échéance aujourd'hui"}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-ink-950 dark:text-white">
                      Transmettre la facture de clôture #2026-04
                    </div>
                    <div className="text-xs text-ink-500">
                      Montant : 2 400 € • Client Formation Pro
                    </div>
                  </div>

                  <button
                    onClick={() => setTaskPostponed(!taskPostponed)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      taskPostponed
                        ? "bg-emerald-500 text-white"
                        : "bg-ink-100 dark:bg-ink-800 hover:bg-amber-500 hover:text-slate-950 text-ink-700 dark:text-ink-200"
                    }`}
                    title="Reporter de 7 jours"
                  >
                    {taskPostponed ? "✓ Reportée +7j" : "+7j Reporter"}
                  </button>
                </div>
              </div>

              {/* Contextual Smart Alert Banner */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Alerte prompte :</strong> Votre déclaration trimestrielle arrive à échéance dans 4 jours.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 hidden sm:inline">
                  Échéance : 28 Oct
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
