"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export function LandingPricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="py-24 bg-canvas border-t border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3 py-1 rounded-full">
            Tarifs Transparents
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink-950 mt-3 font-sans">
            Un investissement rentabilisé dès le premier mois
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4">
            Choisissez la formule adaptée à votre niveau d&apos;activité. Passez à la vitesse supérieure sans mauvaise surprise.
          </p>

          {/* Toggle Mensuel / Annuel */}
          <div className="mt-8 inline-flex items-center gap-3 bg-canvas-raised p-1.5 rounded-full border border-ink-200">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !yearly ? "bg-ink-950 text-white shadow-xs" : "text-ink-600 hover:text-ink-950"
              }`}
            >
              Facturation mensuelle
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                yearly ? "bg-ink-950 text-white shadow-xs" : "text-ink-600 hover:text-ink-950"
              }`}
            >
              <span>Facturation annuelle</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-positive/20 text-positive font-bold">
                -25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Tier 1: Découverte / Free */}
          <div className="p-8 rounded-2xl bg-canvas border border-ink-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">Free (Découverte)</h3>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-ink-100 text-ink-700">
                  Gratuit
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Pour démarrer sereinement et structurer vos premières activités plurielles.
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-ink-950">0 €</span>
                <span className="text-xs text-ink-500 font-medium">/ pour toujours</span>
              </div>

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Jusqu&apos;à <strong>3 activités</strong> actives</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Jusqu&apos;à <strong>5 contacts &amp; clients</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Jusqu&apos;à <strong>2 objectifs d&apos;épargne</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Jusqu&apos;à <strong>3 budgets mensuels</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Calendrier multi-vues &amp; suivi prévisionnel</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3 px-4 rounded-full border border-ink-300 text-ink-950 font-semibold text-xs text-center hover:bg-ink-100 transition-colors tap-active"
            >
              Commencer gratuitement
            </Link>
          </div>

          {/* Tier 2: Pro (Featured) */}
          <div className="p-8 rounded-2xl bg-canvas-raised border-2 border-signal shadow-xl shadow-signal/10 flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-signal text-white text-[11px] font-bold tracking-wide uppercase shadow-sm">
              <Sparkles className="w-3 h-3 text-white" />
              Le plus populaire
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">Pro</h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-signal-soft text-signal">
                  Complet
                </span>
              </div>
              <p className="text-xs text-ink-500">
                L&apos;arsenal complet pour les pluriactifs, consultants et indépendants dynamiques.
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-ink-950">
                  {yearly ? "7,50 €" : "9 €"}
                </span>
                <span className="text-xs text-ink-500 font-medium">/ mois</span>
              </div>
              {yearly && (
                <span className="text-[11px] text-positive font-semibold">
                  Facturé 90 € / an (économie de 18 €)
                </span>
              )}

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-950">
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Jusqu&apos;à <strong>15 activités</strong> actives</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Jusqu&apos;à <strong>50 contacts &amp; clients</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Jusqu&apos;à <strong>10 objectifs d&apos;épargne</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Jusqu&apos;à <strong>15 budgets mensuels</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>Calcul de rentabilité nette horaire</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>Gestion multi-devises unifiée</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Détection automatique des conflits d&apos;horaires</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3.5 px-4 rounded-full bg-signal text-white font-semibold text-xs text-center shadow-md shadow-signal/20 hover:bg-signal-dark hover:shadow-lg transition-all tap-active"
            >
              Démarrer avec le Pro
            </Link>
          </div>

          {/* Tier 3: Premium */}
          <div className="p-8 rounded-2xl bg-canvas border border-ink-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">Premium</h3>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-gold-soft text-gold-dark font-bold">
                  Illimité &amp; IA
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Pour les multi-entrepreneurs et dirigeants exigeant une liberté totale et l&apos;intelligence prédictive.
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-ink-950">
                  {yearly ? "15,80 €" : "19 €"}
                </span>
                <span className="text-xs text-ink-500 font-medium">/ mois</span>
              </div>
              {yearly && (
                <span className="text-[11px] text-positive font-semibold">
                  Facturé 190 € / an (économie de 38 €)
                </span>
              )}

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>Activités illimitées</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>Contacts &amp; clients illimités</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>Objectifs d&apos;épargne &amp; budgets illimités</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Rapport de rentabilité horaire &amp; multi-devises</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span><strong>Assistant IA &amp; insights prédictifs</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={3} />
                  <span>Support prioritaire 7j/7</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3 px-4 rounded-full border border-ink-300 text-ink-950 font-semibold text-xs text-center hover:bg-ink-100 transition-colors tap-active"
            >
              Découvrir Premium
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
