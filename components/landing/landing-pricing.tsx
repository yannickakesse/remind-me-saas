"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export function LandingPricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-canvas border-t border-ink-200/60 dark:border-ink-800/60 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-18">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            Tarifs Transparents
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 dark:text-white mt-4 tracking-tight font-sans">
            Des forfaits clairs, sans surprise.
          </h2>
          <p className="text-base sm:text-lg text-ink-600 dark:text-ink-300 mt-3 leading-relaxed">
            Commencez gratuitement sans carte bancaire, puis évoluez selon l&apos;ampleur de vos activités.
          </p>

          {/* Toggle Mensuel / Annuel */}
          <div className="mt-8 inline-flex items-center gap-1.5 bg-canvas-raised p-1.5 rounded-full border border-ink-200 dark:border-ink-800 shadow-xs">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !yearly
                  ? "bg-ink-950 dark:bg-white text-white dark:text-slate-950 shadow-sm"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              Facturation mensuelle
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                yearly
                  ? "bg-ink-950 dark:bg-white text-white dark:text-slate-950 shadow-sm"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              <span>Facturation annuelle</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                2 mois offerts
              </span>
            </button>
          </div>
        </div>

        {/* 3 Cartes de forfaits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {/* Plan 1: Gratuit */}
          <div className="p-7 sm:p-8 rounded-3xl bg-canvas border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-ink-950 dark:text-white">Gratuit</h3>
                  <p className="text-xs text-ink-500 mt-0.5">Pour découvrir et démarrer</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300">
                  Découverte
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-ink-950 dark:text-white">0 €</span>
                  <span className="text-xs text-ink-500">/ mois</span>
                </div>
                <p className="text-xs text-ink-500 font-medium mt-1">Sans engagement ni carte bancaire</p>
              </div>

              <ul className="space-y-3 pt-6 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-700 dark:text-ink-300">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Jusqu&apos;à <strong>3 activités</strong> simultanées</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Jusqu&apos;à <strong>5 contacts / clients</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>2 objectifs & 3 budgets prévisionnels</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Calendrier avec détection des conflits</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Export des données CSV</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3.5 px-4 rounded-full border border-ink-300 dark:border-ink-700 text-ink-950 dark:text-white font-semibold text-xs text-center hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>

          {/* Plan 2: Pro (Recommandé) */}
          <div className="p-7 sm:p-8 rounded-3xl bg-canvas-raised border-2 border-amber-500 shadow-xl shadow-amber-500/10 flex flex-col justify-between space-y-8 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold tracking-wide uppercase shadow-sm">
              <Sparkles className="w-3 h-3 text-slate-950" />
              Recommandé pour indépendants
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-ink-950 dark:text-white">Pro</h3>
                  <p className="text-xs text-ink-500 mt-0.5">Pour consultants et pluriactifs</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  Complet
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-ink-950 dark:text-white">
                    {yearly ? "90 €" : "9 €"}
                  </span>
                  <span className="text-xs text-ink-500">{yearly ? "/ an" : "/ mois"}</span>
                </div>
                {yearly && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Équivaut à 7,50 € / mois (2 mois offerts)
                  </p>
                )}
              </div>

              <ul className="space-y-3 pt-6 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-900 dark:text-ink-100">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Jusqu&apos;à <strong>15 activités</strong> simultanées</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Jusqu&apos;à <strong>50 contacts / clients</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>10 objectifs & 15 budgets</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span><strong>Calcul de rentabilité horaire nette</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span><strong>Multi-devises</strong> (EUR, XOF, USD, GBP...)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span><strong>Automatisations récurrentes</strong> & échéanciers</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Export complet CSV & rapports</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3.5 px-4 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs text-center shadow-md shadow-amber-500/20 hover:shadow-lg transition-all"
            >
              Choisir le forfait Pro
            </Link>
          </div>

          {/* Plan 3: Premium */}
          <div className="p-7 sm:p-8 rounded-3xl bg-canvas border border-ink-200/80 dark:border-ink-800 shadow-sm flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-ink-950 dark:text-white">Premium</h3>
                  <p className="text-xs text-ink-500 mt-0.5">Pour les structures et agences</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400">
                  Illimité
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-ink-950 dark:text-white">
                    {yearly ? "190 €" : "19 €"}
                  </span>
                  <span className="text-xs text-ink-500">{yearly ? "/ an" : "/ mois"}</span>
                </div>
                {yearly && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Équivaut à 15,83 € / mois (2 mois offerts)
                  </p>
                )}
              </div>

              <ul className="space-y-3 pt-6 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-700 dark:text-ink-300">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span><strong>Activités illimitées</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span><strong>Contacts & clients illimités</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span><strong>Objectifs & budgets illimités</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span><strong>Assistant IA & insights prédictifs</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Toutes les fonctionnalités Pro incluses</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  <span>Support prioritaire par email</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3.5 px-4 rounded-full border border-ink-300 dark:border-ink-700 text-ink-950 dark:text-white font-semibold text-xs text-center hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            >
              Choisir le forfait Premium
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
