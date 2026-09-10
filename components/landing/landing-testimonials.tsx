export function LandingTestimonials() {
  const testimonials = [
    {
      name: "Thomas B.",
      role: "Enseignant Université & Consultant IA",
      content:
        "Avant Remind Me, je vivais dans la peur permanente de poser un rendez-vous client sur une heure de cours. La détection des conflits et le calcul automatique de ma rentabilité ont tout changé.",
      rating: 5,
      avatar: "TB",
    },
    {
      name: "Sarah M.",
      role: "Salariée Tech & Freelance UX/UI",
      content:
        "Je dégage 1 800 € de freelance par mois en plus de mon CDI. Remind Me me permet de tracer chaque heure et de savoir exactement ce que je dois déclarer aux impôts sans prise de tête.",
      rating: 5,
      avatar: "SM",
    },
    {
      name: "Alexandre D.",
      role: "Entrepreneur (2 Sociétés + Conférencier)",
      content:
        "La gestion des dépenses programmées est un bijou : je vois en amont mes échéances de serveurs et de charges sans jamais être surpris à la fin du mois.",
      rating: 5,
      avatar: "AD",
    },
  ];

  return (
    <section className="py-24 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal bg-signal-soft px-3.5 py-1.5 rounded-full">
            Témoignages
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-950 mt-4 tracking-tight font-sans">
            Adopté par ceux qui mènent plusieurs vies professionnelles de front.
          </h2>
          <p className="text-base sm:text-lg text-ink-700 mt-4 leading-relaxed">
            Découvrez comment Remind Me redonne de la clarté et de la sérénité à leur quotidien.
          </p>
        </div>

        {/* Impact Numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16 text-center">
          <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
            <div className="text-3xl font-extrabold text-signal">+8 h</div>
            <div className="text-xs text-ink-500 mt-1">Économisées par semaine</div>
          </div>
          <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
            <div className="text-3xl font-extrabold text-positive">100%</div>
            <div className="text-xs text-ink-500 mt-1">Conflits d&apos;agenda évités</div>
          </div>
          <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
            <div className="text-3xl font-extrabold text-warning">0 €</div>
            <div className="text-xs text-ink-500 mt-1">Facture ou impayé oublié</div>
          </div>
          <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
            <div className="text-3xl font-extrabold text-ink-950">&lt; 100ms</div>
            <div className="text-xs text-ink-500 mt-1">Temps de réponse de l&apos;app</div>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl bg-canvas-raised border border-ink-200/70 shadow-sm card-interactive flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-warning">
                  {[...Array(t.rating)].map((_, i) => (
                    <span key={i} className="text-sm">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-ink-700 italic leading-relaxed">
                  &ldquo;{t.content}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-ink-100">
                <div className="w-10 h-10 rounded-full bg-signal text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink-950">{t.name}</div>
                  <div className="text-[11px] text-ink-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
