"use client";

import { useState } from "react";

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Comment fonctionne la détection automatique des conflits d'agenda ?",
      a: "Remind Me analyse en temps réel les horaires de début et de fin de chaque créneau rattaché à vos activités. Si deux événements se chevauchent (même partiellement), une alerte visuelle claire apparaît immédiatement sur votre calendrier et votre tableau de bord, vous évitant toute double-réservation.",
    },
    {
      q: "Puis-je gérer différentes devises pour mes clients internationaux ?",
      a: "Absolument. Vous définissez une devise principale pour votre profil (EUR, USD, GBP, CHF, CAD, etc.), mais chaque activité ou encaissement peut être libellé dans sa devise d'origine. Les synthèses globales et rentabilités sont automatiquement converties.",
    },
    {
      q: "Comment mes données et mes informations financières sont-elles sécurisées ?",
      a: "La sécurité et la confidentialité sont notre priorité absolue. Vos données sont isolées au niveau de la base de données par des politiques Row Level Security (RLS) strictes sous PostgreSQL. Personne d'autre que vous ne peut accéder à vos fiches clients ou à vos montants financiers.",
    },
    {
      q: "Qu'est-ce qu'une dépense programmée et comment fonctionne le cycle auto ?",
      a: "Une dépense programmée représente une charge récurrente (loyer de bureau, abonnement SaaS, prime d'assurance). Elle passe automatiquement du statut 'Planifiée' à 'Due' à l'approche de la date. En un clic sur 'Marquer comme payée', l'écriture réelle est générée et la prochaine date est automatiquement reportée selon la périodicité choisie.",
    },
    {
      q: "Puis-je exporter mes données pour mon expert-comptable ?",
      a: "Oui, en un clic depuis la section Finances ou Rapports, vous pouvez générer un export CSV complet et structuré de l'ensemble de vos écritures (revenus perçus, dépenses, déductibilité fiscale, clients associés).",
    },
    {
      q: "L'application fonctionne-t-elle bien sur smartphone ?",
      a: "L'application a été entièrement conçue selon une approche Mobile-First stricte. Menu hamburger ultra-fluide, feedback tactile en moins de 100ms, formulaires adaptés aux écrans tactiles : vous pilotez votre quotidien aussi facilement sur mobile que sur grand écran.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-canvas-raised border-y border-ink-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            Foire Aux Questions
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            Tout ce que vous devez savoir.
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            Vous avez une question sur le fonctionnement de Remind Me ? Voici les réponses les plus fréquentes.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-3xl bg-canvas border border-ink-200/70 shadow-xs card-interactive overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-semibold text-ink-950 hover:text-signal transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <span
                    className={`w-6 h-6 rounded-full bg-ink-100 flex items-center justify-center shrink-0 text-ink-700 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-signal text-white" : ""
                    }`}
                  >
                    ↓
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-ink-700 leading-relaxed animate-in fade-in duration-200">
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
