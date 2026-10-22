"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Layers,
  Wallet,
  Calendar,
  CheckSquare,
  BellRing,
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Moon,
  Sparkles,
} from "lucide-react";

export function LandingFeatures() {
  const [taskDone, setTaskDone] = useState(false);
  const [postponed, setPostponed] = useState(false);

  return (
    <section id="features" className="py-24 sm:py-32 bg-canvas overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            Fonctionnalités Clés
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 dark:text-white mt-4 tracking-tight font-sans">
            Montrer, ne pas seulement décrire.
          </h2>
          <p className="text-base sm:text-lg text-ink-600 dark:text-ink-300 mt-4 leading-relaxed">
            Chaque module de Remind Me a été pensé pour résoudre un problème concret rencontré par ceux qui mènent plusieurs vies professionnelles de front.
          </p>
        </div>

        {/* Feature Grid: 6 Differentiated Layouts */}
        <div className="space-y-8 sm:space-y-12">
          {/* Row 1: Large Module A (Vision Centralisée) */}
          <div className="p-6 sm:p-10 rounded-3xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Module 01 • Cockpit Quotidien</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-ink-950 dark:text-white">
                  Une vision centralisée dès la première seconde
                </h3>
                <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                  Le dashboard est votre point de départ quotidien. Il synthétise instantanément les priorités du jour, vos prochaines sessions, l&apos;état de vos encaissements et les alertes qui requièrent votre attention.
                </p>
                <ul className="space-y-2 text-xs text-ink-700 dark:text-ink-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Statut de santé de la journée calculé en temps réel</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Navigation fluide entre activités sans changer d&apos;espace</span>
                  </li>
                </ul>
              </div>

              {/* Visual Showcase: Cockpit Morning Brief */}
              <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-canvas border border-ink-100 dark:border-ink-800/80 shadow-xs space-y-4">
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

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
                    <div className="text-[10px] text-ink-500">Séances du jour</div>
                    <div className="text-lg font-bold text-ink-950 dark:text-white mt-0.5">2 créneaux</div>
                    <div className="text-[10px] text-emerald-600 font-medium">0 conflit</div>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
                    <div className="text-[10px] text-ink-500">À encaisser</div>
                    <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">1 450 €</div>
                    <div className="text-[10px] text-ink-400">1 facture</div>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas-raised border border-ink-100 dark:border-ink-800">
                    <div className="text-[10px] text-ink-500">Tâches urgentes</div>
                    <div className="text-lg font-bold text-ink-950 dark:text-white mt-0.5">1 prioritaire</div>
                    <div className="text-[10px] text-red-500 font-medium">Report possible</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                  <span className="text-amber-900 dark:text-amber-200">
                    ✦ Conseil du jour : Vos créneaux de l&apos;après-midi sont réservés pour la production.
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">Atelier Pro</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Two Columns - Feature B (Activités) & Feature C (Finances) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feature B: Des activités mieux organisées */}
            <div className="p-6 sm:p-8 rounded-3xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Module 02 • Pluriactivité</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-ink-950 dark:text-white">
                  Des activités mieux organisées
                </h3>
                <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                  Distinguez clairement vos activités permanentes de vos missions temporaires avec dates de validité définies.
                </p>
              </div>

              {/* Visual Showcase: Permanent vs Temporary */}
              <div className="space-y-3">
                {/* Permanent Activity Card */}
                <div className="p-4 rounded-2xl bg-canvas border border-ink-100 dark:border-ink-800">
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

                {/* Temporary Activity Card with Validity Dates */}
                <div className="p-4 rounded-2xl bg-canvas border border-ink-100 dark:border-ink-800">
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

            {/* Feature C: Des finances plus lisibles */}
            <div className="p-6 sm:p-8 rounded-3xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Module 03 • Trésorerie & Rentabilité</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-ink-950 dark:text-white">
                  Des finances plus lisibles
                </h3>
                <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                  Revenus encaissés, paiements en attente, charges fixes programmées et calcul automatique de la rentabilité horaire nette.
                </p>
              </div>

              {/* Visual Showcase: Financial Breakdown */}
              <div className="p-4 sm:p-5 rounded-2xl bg-canvas border border-ink-100 dark:border-ink-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-500">Flux d&apos;octobre</span>
                  <span className="font-mono text-emerald-600 font-bold">+3 600 € net</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas-raised text-xs">
                    <span className="text-ink-700 dark:text-ink-300">Revenus encaissés</span>
                    <span className="font-mono font-bold text-emerald-600">4 850 €</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas-raised text-xs">
                    <span className="text-ink-700 dark:text-ink-300">Factures en attente</span>
                    <span className="font-mono font-bold text-amber-600">1 250 € (2)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas-raised text-xs">
                    <span className="text-ink-700 dark:text-ink-300">Dépenses & charges programmées</span>
                    <span className="font-mono font-bold text-red-500">- 1 250 €</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between text-[11px] font-mono text-ink-500">
                  <span>Rentabilité calculée : <strong>64 €/h net</strong></span>
                  <span className="text-emerald-600 font-semibold">Solde garanti</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Three Columns - Feature D (Calendrier), Feature E (Tâches), Feature F (Rappels) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature D: Calendrier utile au quotidien */}
            <div className="p-6 rounded-3xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-5">
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Module 04</span>
                </div>
                <h3 className="text-lg font-bold text-ink-950 dark:text-white">
                  Calendrier sans collision
                </h3>
                <p className="text-xs text-ink-600 dark:text-ink-300 leading-relaxed">
                  L&apos;agenda analyse vos créneaux et vous avertit immédiatement en cas de double-réservation entre deux activités.
                </p>
              </div>

              {/* Conflict Detection Badge in Mock Calendar */}
              <div className="p-3.5 rounded-2xl bg-canvas border border-ink-100 dark:border-ink-800 space-y-2">
                <div className="text-[11px] font-mono text-ink-400">Aujourd&apos;hui 14:00</div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">Session Conseil Client</div>
                  <div className="text-[10px] text-emerald-600">14:00 - 15:30 • 0 conflit</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>Plage tampon 30 min respectée</span>
                </div>
              </div>
            </div>

            {/* Feature E: Tâches plus faciles à suivre */}
            <div className="p-6 rounded-3xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-5">
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Module 05</span>
                </div>
                <h3 className="text-lg font-bold text-ink-950 dark:text-white">
                  Tâches & Report +7j
                </h3>
                <p className="text-xs text-ink-600 dark:text-ink-300 leading-relaxed">
                  Des priorités claires par activité. Si un imprévu survient, reportez la tâche d&apos;une semaine d&apos;un simple clic sans stress.
                </p>
              </div>

              {/* Interactive Task Element */}
              <div className="p-3.5 rounded-2xl bg-canvas border border-ink-100 dark:border-ink-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Haute priorité</span>
                  <span className="text-[10px] font-mono text-ink-400">
                    {postponed ? "Reportée au 31/10" : "Échéance : 24/10"}
                  </span>
                </div>
                <div className="text-xs font-bold text-ink-950 dark:text-white flex items-center gap-2">
                  <button
                    onClick={() => setTaskDone(!taskDone)}
                    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                      taskDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-ink-300"
                    }`}
                  >
                    {taskDone && "✓"}
                  </button>
                  <span className={taskDone ? "line-through text-ink-400" : ""}>
                    Envoyer synthèse client
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-ink-400">Conseil Stratégique</span>
                  <button
                    onClick={() => setPostponed(!postponed)}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-ink-100 dark:bg-ink-800 hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    {postponed ? "✓ Reporté +7j" : "+7j Reporter"}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature F: Rappels contextuels */}
            <div className="p-6 rounded-3xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-5">
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Module 06</span>
                </div>
                <h3 className="text-lg font-bold text-ink-950 dark:text-white">
                  Rappels contextuels
                </h3>
                <p className="text-xs text-ink-600 dark:text-ink-300 leading-relaxed">
                  Échéancier étagé (J-7, J-3, J-1) qui respecte vos heures calmes et ne sonne jamais inutilement.
                </p>
              </div>

              {/* Stepped Reminder Visual */}
              <div className="p-3.5 rounded-2xl bg-canvas border border-ink-100 dark:border-ink-800 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-ink-500">
                  <span>Échelonnement</span>
                  <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <Moon className="w-3 h-3" /> Heures calmes 20h-08h
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                  <div className="p-1.5 rounded-lg bg-canvas-raised text-ink-500">J-7</div>
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">J-3</div>
                  <div className="p-1.5 rounded-lg bg-canvas-raised text-ink-500">J-1</div>
                  <div className="p-1.5 rounded-lg bg-canvas-raised text-ink-500">Jour J</div>
                </div>
                <div className="text-[11px] text-ink-600 dark:text-ink-400 mt-1">
                  ✦ Notification discrète envoyée à 09:15 lors de votre briefing matinal.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
