"use client";

import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      {/* Background Glows and Decorative Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-signal/15 via-info/10 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-positive/10 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Product Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-signal-soft border border-signal/20 text-signal text-xs font-semibold tracking-wide mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
          <span>La nouvelle référence pour les pluriactifs &amp; indépendants</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-ink-950 font-sans max-w-5xl mx-auto leading-[1.1] mb-6">
          Votre travail, votre temps et votre argent.{" "}
          <span className="bg-gradient-to-r from-signal via-signal/90 to-info bg-clip-text text-transparent underline decoration-signal/30 decoration-wavy decoration-2">
            Enfin sous contrôle.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-lg sm:text-xl text-ink-700 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          Fini le jonglage entre 4 calendriers et 10 tableurs. <strong>Remind Me</strong> est le véritable
          cockpit tout-en-un qui relie vos créneaux, vos clients, vos encaissements et vos dépenses programmées
          avec détection intelligente des conflits.
        </p>

        {/* Action Buttons Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-signal text-white font-semibold text-base shadow-lg shadow-signal/25 hover:bg-signal/90 hover:shadow-xl hover:shadow-signal/30 transition-all duration-200 tap-active group"
          >
            <span>Créer mon compte gratuit</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          <a
            href="#product-demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-canvas-raised border border-ink-300 text-ink-950 font-semibold text-base hover:bg-ink-100 hover:border-ink-500 transition-all duration-200 tap-active shadow-sm"
          >
            <svg
              className="w-5 h-5 text-signal"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Explorer la démo interactive</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm text-ink-500 font-medium">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Sans carte bancaire</span>
          </div>
          <span className="hidden sm:inline text-ink-300">•</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Prise en main en 2 minutes</span>
          </div>
          <span className="hidden sm:inline text-ink-300">•</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Isolation RLS &amp; Données Chiffrées</span>
          </div>
        </div>
      </div>
    </section>
  );
}
