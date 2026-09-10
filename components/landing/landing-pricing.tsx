"use client";

import { useState } from "react";
import Link from "next/link";

export function LandingPricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="py-24 bg-canvas-raised border-y border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            Tarifs Transparents
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            Des formules claires. Sans frais cachés.
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            Démarrez gratuitement pour structurer votre quotidien, passez à la vitesse supérieure quand vos activités grandissent.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className={`text-sm font-medium ${
                !yearly ? "text-ink-950 font-bold" : "text-ink-500"
              }`}
            >
              Mensuel
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className="w-14 h-8 rounded-full bg-ink-100 p-1 relative transition-colors focus:outline-none focus:ring-2 focus:ring-signal"
              aria-label="Basculer entre facturation mensuelle et annuelle"
            >
              <div
                className={`w-6 h-6 rounded-full bg-signal transition-transform duration-200 ${
                  yearly ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-medium ${
                  yearly ? "text-ink-950 font-bold" : "text-ink-500"
                }`}
              >
                Annuel
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-positive-soft text-positive border border-positive/20">
                -25% offerts
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {/* Tier 1: Starter */}
          <div className="p-8 rounded-2xl bg-canvas border border-ink-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">Starter</h3>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-ink-100 text-ink-700">
                  Gratuit
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Pour poser les bases et découvrir la gestion unifiée sans aucun engagement.
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-ink-950">0 €</span>
                <span className="text-xs text-ink-500 font-medium">/ pour toujours</span>
              </div>

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-700">
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Jusqu&apos;à <strong>2 activités</strong> actives</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Calendrier multi-vues (Mois, Semaine, Jour)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Suivi basique des tâches &amp; contacts</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Devise unique principale</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3 px-4 rounded-xl border border-ink-300 text-ink-950 font-semibold text-xs text-center hover:bg-ink-100 transition-colors tap-active"
            >
              Commencer gratuitement
            </Link>
          </div>

          {/* Tier 2: Pro (Featured) */}
          <div className="p-8 rounded-2xl bg-canvas border-2 border-signal shadow-xl shadow-signal/10 flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-signal text-white text-[11px] font-bold tracking-wide uppercase shadow-sm">
              ✨ Le plus populaire
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">Pro</h3>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-signal-soft text-signal">
                  Complet
                </span>
              </div>
              <p className="text-xs text-ink-500">
                L&apos;arsenal complet pour les pluriactifs, consultants et indépendants réguliers.
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-signal">
                  {yearly ? "9 €" : "12 €"}
                </span>
                <span className="text-xs text-ink-500 font-medium">/ mois</span>
              </div>
              {yearly && (
                <span className="text-[11px] text-positive font-semibold">
                  Facturé 108 € / an (économie de 36 €)
                </span>
              )}

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-950">
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span><strong>Activités &amp; clients illimités</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span><strong>Détection intelligente des conflits</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span><strong>Dépenses programmées &amp; cycle auto</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Calcul de rentabilité nette par heure</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Export comptable CSV en 1 clic</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Multi-devises &amp; conversion automatique</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3.5 px-4 rounded-xl bg-signal text-white font-semibold text-xs text-center shadow-md shadow-signal/25 hover:bg-signal/90 hover:shadow-lg transition-all tap-active"
            >
              Démarrer mon essai de 14 jours
            </Link>
          </div>

          {/* Tier 3: Studio / Équipe */}
          <div className="p-8 rounded-2xl bg-canvas border border-ink-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-ink-950">Studio</h3>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-ink-100 text-ink-700">
                  Sur-mesure
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Pour les collectifs, cabinets de conseil et multi-entrepreneurs avec équipe.
              </p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-ink-950">
                  {yearly ? "24 €" : "29 €"}
                </span>
                <span className="text-xs text-ink-500 font-medium">/ mois</span>
              </div>

              <ul className="space-y-3 pt-6 border-t border-ink-100 text-xs text-ink-700">
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Tout le forfait Pro inclus</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Multi-comptes &amp; accès partagé sécurisé</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Rapports analytiques consolidés</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-positive font-bold">✓</span>
                  <span>Support prioritaire par email &amp; visio</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3 px-4 rounded-xl border border-ink-300 text-ink-950 font-semibold text-xs text-center hover:bg-ink-100 transition-colors tap-active"
            >
              Contacter pour une démo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
