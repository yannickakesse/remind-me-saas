export function LandingPersonas() {
  const personas = [
    {
      role: "Enseignant + Entrepreneur / Consultant",
      badge: "Double Casquette",
      description:
        "Vous partagez votre semaine entre les amphis universitaires et des missions de conseil privé pour des entreprises.",
      painPoint: "Horaires académiques fixes vs Disponibilités clients fluctuantes",
      solution: "Créneaux récurrents verrouillés pour les cours et slots flexibles pour vos interventions facturées au forfait.",
      avatarBg: "from-signal to-info",
    },
    {
      role: "Salarié + Freelance / Side-Business",
      badge: "Cumul d'Activités",
      description:
        "Vous occupez un emploi à temps partiel ou plein et développez en parallèle votre clientèle indépendante.",
      painPoint: "Ne pas mélanger les heures de bureau et les livrables freelance",
      solution: "Séparation hermétique des activités, suivi précis du temps passé et visibilité nette sur les revenus d'appoint.",
      avatarBg: "from-positive to-signal",
    },
    {
      role: "Entrepreneur Multi-Projets",
      badge: "Multi-Sociétés",
      description:
        "Vous dirigez plusieurs entités juridiques, marques ou magasins et devez arbitrer votre temps entre chaque structure.",
      painPoint: "Incapacité à savoir quelle activité est la plus rentable par heure",
      solution: "Tableau de rentabilité consolidé, imputation précise des charges et trésorerie par organisation.",
      avatarBg: "from-warning to-danger",
    },
    {
      role: "Coach / Formateur / Thérapeute",
      badge: "Multi-Clients",
      description:
        "Vous facturez à la séance, à l'heure ou au pack mensuel auprès de dizaines de clients particuliers et professionnels.",
      painPoint: "Retards de paiement et créneaux oubliés dans l'agenda",
      solution: "Fiches contacts unifiées, suivi automatique des encaissements dus et rappels des séances.",
      avatarBg: "from-info to-positive",
    },
  ];

  return (
    <section id="personas" className="py-24 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            Profils Utilisateurs
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            Pensé pour tous ceux qui refusent d&apos;être enfermés dans une seule case.
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            La vie professionnelle moderne est plurielle. Remind Me est le premier outil qui s&apos;adapte à votre réalité, pas l&apos;inverse.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {personas.map((persona, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-canvas-raised border border-ink-200/70 shadow-sm card-interactive space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-signal-soft text-signal">
                  {persona.badge}
                </span>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${persona.avatarBg} opacity-80`} />
              </div>

              <h3 className="text-lg font-bold text-ink-950">{persona.role}</h3>

              <p className="text-sm text-ink-700 leading-relaxed">
                {persona.description}
              </p>

              <div className="pt-3 border-t border-ink-100 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-danger">
                  <span className="font-bold">Défi :</span>
                  <span>{persona.painPoint}</span>
                </div>
                <div className="flex items-start gap-2 text-positive">
                  <span className="font-bold">Solution :</span>
                  <span>{persona.solution}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
