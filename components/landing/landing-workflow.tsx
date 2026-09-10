export function LandingWorkflow() {
  const steps = [
    {
      time: "08:30",
      tag: "Cockpit Matinal",
      title: "Savoir exactement quoi faire et pour qui",
      description:
        "Ouvrez votre dashboard : votre planning multi-activités est consolidé. Vous visualisez vos 3 créneaux de la journée, vos priorités urgentes et le montant attendu pour ce jour de travail.",
      highlight: "+450 € attendus aujourd'hui",
    },
    {
      time: "11:15",
      tag: "Protection Anti-Conflit",
      title: "Une réunion client proposée ? Conflit détecté instantanément",
      description:
        "Avant même d'accepter une invitation, Remind Me détecte le chevauchement avec un cours magistral ou une intervention programmée. Vous déplacez le créneau sans stress.",
      highlight: "Zéro double-réservation",
    },
    {
      time: "15:45",
      tag: "Trésorerie & Dépenses",
      title: "Une facture reçue ? Votre solde et marge se mettent à jour",
      description:
        "En un clic, marquez un virement reçu de votre client. En parallèle, votre loyer de coworking arrive à échéance : vous le validez en un clic sans rupture de trésorerie.",
      highlight: "Rentabilité recalculée en temps réel",
    },
    {
      time: "19:00",
      tag: "Bilan & Sérénité",
      title: "Fermez votre journée l'esprit totalement tranquille",
      description:
        "Pas d'heures supplémentaires à faire des comptes d'apothicaire sur un tableur. Vos heures sont tracées, vos dépenses déductibles sont archivées et votre rentabilité est nette.",
      highlight: "Esprit 100% libéré pour votre soirée",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-canvas-raised border-y border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            Flux de Travail
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            Une journée type avec Remind Me
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            Voyez comment la plateforme vous accompagne du premier café du matin jusqu&apos;à la clôture de vos activités le soir.
          </p>
        </div>

        {/* Vertical Connected Timeline */}
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute top-6 bottom-6 left-4 sm:left-1/2 -translate-x-1/2 w-0.5 bg-ink-100 hidden sm:block" />

          <div className="space-y-12">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col sm:flex-row items-start ${
                  idx % 2 === 0 ? "sm:flex-row-reverse" : ""
                } gap-6 sm:gap-12`}
              >
                {/* Center Time Node */}
                <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-canvas border-2 border-signal items-center justify-center text-xs font-mono font-bold text-signal z-10 shadow-sm">
                  {idx + 1}
                </div>

                {/* Content Box */}
                <div className="w-full sm:w-1/2 p-6 rounded-2xl bg-canvas border border-ink-100 shadow-sm hover:border-signal/30 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-signal bg-signal-soft px-2.5 py-1 rounded-md">
                      {step.time} • {step.tag}
                    </span>
                    <span className="text-xs font-semibold text-positive">
                      {step.highlight}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-ink-950">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
