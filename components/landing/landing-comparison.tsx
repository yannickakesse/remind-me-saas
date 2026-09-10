export function LandingComparison() {
  return (
    <section className="py-20 bg-canvas-raised border-y border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3 py-1 rounded-full">
            Le Changement
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink-950 mt-3 font-sans">
            Le chaos de la pluriactivité vs La clarté Remind Me
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4">
            Gérer plusieurs vies professionnelles avec des outils traditionnels est épuisant.
            Découvrez la différence d&apos;un outil pensé dès le départ pour le cumul d&apos;activités.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chaos Side */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-danger/20 shadow-sm card-interactive relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-danger/10 text-danger font-semibold text-xs rounded-bl-xl border-l border-b border-danger/20">
              ❌ AVANT (Le chaos quotidien)
            </div>

            <h3 className="text-xl font-bold text-ink-950 mb-6 flex items-center gap-2">
              <span>Fragmentation mentale permanente</span>
            </h3>

            <ul className="space-y-4 text-sm text-ink-700">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✕
                </span>
                <span>
                  <strong>Agendas dispersés :</strong> Vous synchronisez manuellement votre Google Calendar perso, votre Outlook pro et vos notes papier.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✕
                </span>
                <span>
                  <strong>Doubles-réservations et conflits :</strong> Aucun outil ne vous alerte lorsqu&apos;un cours et un rendez-vous client tombent en même temps.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✕
                </span>
                <span>
                  <strong>Angles morts financiers :</strong> Incapable de savoir exactement combien chaque activité vous rapporte net à la fin du mois.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✕
                </span>
                <span>
                  <strong>Factures oubliées et impayés :</strong> Des retards de paiements qui passent inaperçus dans des classeurs de tableurs Excel.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✕
                </span>
                <span>
                  <strong>Charges surprises :</strong> Abonnements récurrents et taxes qui tombent sans avoir été budgétées.
                </span>
              </li>
            </ul>
          </div>

          {/* Clarity Side */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas-raised border-2 border-signal/40 shadow-lg shadow-signal/5 card-interactive relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-signal text-white font-semibold text-xs rounded-bl-xl shadow-sm">
              ✨ AVEC REMIND ME (La sérénité totale)
            </div>

            <h3 className="text-xl font-bold text-ink-950 mb-6 flex items-center gap-2">
              <span>Un cockpit unique et unifié</span>
            </h3>

            <ul className="space-y-4 text-sm text-ink-950">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </span>
                <span>
                  <strong>Visibilité à 360° :</strong> Toutes vos activités, contrats et taux horaires réunis dans un même centre de contrôle.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </span>
                <span>
                  <strong>Détection préventive des conflits :</strong> Le calendrier intelligent calcule instantanément les chevauchements d&apos;horaires et vous protège.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </span>
                <span>
                  <strong>Rentabilité nette en temps réel :</strong> Découvrez automatiquement quel rôle vous rémunère le mieux par heure investie.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </span>
                <span>
                  <strong>Suivi rigoureux des encaissements :</strong> Statuts dérivés automatiques (Reçu, En attente, En retard) pour ne rien laisser filer.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </span>
                <span>
                  <strong>Échéancier des dépenses programmées :</strong> Vos charges fixes sont anticipées sur votre trésorerie et votre calendrier.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
