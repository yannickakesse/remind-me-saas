"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "À qui s'adresse principalement Remind Me ?",
      a: "Remind Me a été spécialement conçu pour les professionnels, consultants, freelances, formateurs, créateurs et indépendants qui mènent plusieurs activités de front et ont besoin d'une vision unifiée de leur temps, de leurs tâches et de leurs finances.",
    },
    {
      q: "Peut-on gérer plusieurs activités distinctes avec des tarifs différents ?",
      a: "Oui. Vous pouvez créer autant d'activités permanentes (ex : Conseil récurrent, Cabinet) ou temporaires (ex : Mission de 3 mois avec date de fin) que votre forfait le permet. Chaque activité possède sa couleur, ses contacts, son mode de tarification (taux horaire ou forfait) et sa devise dédiée.",
    },
    {
      q: "Comment fonctionne le suivi de la trésorerie et des encaissements ?",
      a: "Remind Me centralise vos entrées et vos sorties d'argent. Vous enregistrez vos paiements encaissés, vos factures en attente et vos charges fixes programmées. Le cockpit calcule automatiquement votre solde net et votre rentabilité horaire réelle pour chaque activité.",
    },
    {
      q: "Comment fonctionne la détection des conflits dans le calendrier ?",
      a: "Lorsque vous planifiez un événement ou une séance pour une activité, Remind Me vérifie instantanément si ce créneau chevauche un engagement d'une autre activité. Si un conflit est détecté, une alerte visuelle claire vous avertit avant même la confirmation.",
    },
    {
      q: "Peut-on utiliser Remind Me sur téléphone mobile et ordinateur ?",
      a: "Absolument. Remind Me est développé selon les standards PWA (Progressive Web App). Vous pouvez l'utiliser directement dans votre navigateur sur ordinateur ou l'installer comme une application native sur votre smartphone (iOS ou Android) avec synchronisation en temps réel.",
    },
    {
      q: "Comment démarrer et créer un compte ?",
      a: "Il vous suffit de cliquer sur 'Commencer gratuitement'. L'inscription prend moins de 2 minutes, ne nécessite aucune carte bancaire et vous donne un accès immédiat à votre cockpit avec toutes les fonctionnalités du forfait découverte.",
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28 bg-canvas-raised border-t border-ink-200/60 dark:border-ink-800/60 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14 sm:mb-18">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            Questions Fréquentes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 dark:text-white mt-4 tracking-tight font-sans">
            Tout ce que vous devez savoir.
          </h2>
          <p className="text-base sm:text-lg text-ink-600 dark:text-ink-300 mt-4 leading-relaxed">
            Des réponses claires basées sur le fonctionnement réel de Remind Me.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl sm:rounded-3xl bg-canvas border border-ink-200/70 dark:border-ink-800 shadow-xs overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-semibold text-ink-950 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base pr-2">{faq.q}</span>
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? "rotate-180 bg-amber-500 text-slate-950"
                        : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed border-t border-ink-100 dark:border-ink-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
