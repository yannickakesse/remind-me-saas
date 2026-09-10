export function LandingFeatures() {
  const features = [
    {
      number: "01",
      title: "Gestion Multi-Activités & Clients",
      description:
        "Centralisez tous vos statuts (salarié, freelance, enseignant, entrepreneur), vos modes de travail (présentiel, distanciel, hybride) et vos différents contrats.",
      points: [
        "Fiches complètes avec contacts et organisations clés",
        "Modèles de rémunération flexibles (Taux horaire, forfait jour, fixe récurrent)",
        "Codes couleur et étiquettes personnalisées pour chaque activité",
      ],
      icon: (
        <svg className="w-6 h-6 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Calendrier Idempotent & Conflits",
      description:
        "Générez automatiquement vos créneaux récurrents sans jamais créer de doublons, tout en étant alerté immédiatement des chevauchements d'horaires.",
      points: [
        "Vues intuitives : Mois, Semaine, Jour et Agenda",
        "Calcul temps réel des conflits avec pastilles d'alerte explicites",
        "Occurrences générées à la volée avec respect strict des fuseaux horaires",
      ],
      icon: (
        <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Trésorerie & Rentabilité Nette",
      description:
        "Suivez vos flux financiers réels et prévisionnels. L'application calcule automatiquement votre rentabilité par heure pour chaque type de mission.",
      points: [
        "Suivi des encaissements (Reçu, En attente, En retard avec jours écoulés)",
        "Dépenses catégorisées (Pro, Perso, Mixte avec taux de déductibilité fiscale)",
        "Export comptable CSV structuré en 1 clic pour votre expert-comptable",
      ],
      icon: (
        <svg className="w-6 h-6 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      number: "04",
      title: "Dépenses Programmées & Budgets",
      description:
        "Anticipez vos charges récurrentes (loyers, abonnements logiciels, assurances) avec un cycle de vie automatisé et des alertes d'échéance.",
      points: [
        "Cycle complet : Planifiée → Due → Payée → Report automatique",
        "Action rapide 'Marquer comme payée' créant instantanément l'écriture réelle",
        "Visualisation croisée sur le Dashboard et le Calendrier mensuel",
      ],
      icon: (
        <svg className="w-6 h-6 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="py-24 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            Fonctionnalités Clés
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            Construit pour la complexité. <br />
            <span className="text-signal">Conçu pour la simplicité.</span>
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            Chaque module a été pensé pour éliminer la friction mentale des professionnels qui cumulent plusieurs casquettes au quotidien.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat) => (
            <div
              key={feat.number}
              className="p-8 rounded-3xl bg-canvas-raised border border-ink-200/70 shadow-sm card-interactive space-y-5 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-canvas flex items-center justify-center border border-ink-100 group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>
                <span className="font-mono text-xl font-bold text-ink-300 group-hover:text-signal transition-colors">
                  {feat.number}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-ink-950 group-hover:text-signal transition-colors">
                  {feat.title}
                </h3>
                <p className="text-sm text-ink-700 mt-2 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <ul className="space-y-2.5 pt-2 border-t border-ink-100">
                {feat.points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-ink-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal shrink-0 mt-1.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
