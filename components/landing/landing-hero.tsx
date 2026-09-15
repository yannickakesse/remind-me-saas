"use client";

import Link from "next/link";
import { Star, ArrowUpRight, Play, Check } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-16 md:pt-44 md:pb-28 overflow-hidden">
      {/* Subtle Warm Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-b from-[#EDE6D8]/60 via-[#F3EDE2]/40 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />
      <div className="absolute top-20 right-1/4 w-80 h-80 bg-signal/5 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Social Proof & Title Pill (Inspired by the Reference Design) */}
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-canvas-raised/80 border border-ink-200/80 shadow-xs mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500 backdrop-blur-xs">
          {/* Avatar Cluster */}
          <div className="flex -space-x-2 overflow-hidden items-center">
            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-canvas bg-[#1E293B] text-[10px] text-white font-bold flex items-center justify-center">
              YA
            </div>
            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-canvas bg-[#3B82F6] text-[10px] text-white font-bold flex items-center justify-center">
              MC
            </div>
            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-canvas bg-[#10B981] text-[10px] text-white font-bold flex items-center justify-center">
              SR
            </div>
            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-canvas bg-[#F59E0B] text-[9px] text-white font-bold flex items-center justify-center">
              50+
            </div>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 text-amber-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>

          <span className="text-xs font-semibold text-ink-950 tracking-tight">
            Une référence pour les pluriactifs et les indépendants
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold tracking-tight text-ink-950 font-sans max-w-5xl mx-auto leading-[1.08] mb-6">
          Gérez votre travail, votre temps et votre argent.{" "}
          <span className="block mt-1 sm:mt-2 text-ink-950/90 font-extrabold">
            Au même endroit.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-ink-700 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          Fini le chaos entre 4 calendriers et 10 tableurs. <strong>Remind Me</strong> est le centre de commande
          qui unifie vos activités multiples, planifie vos créneaux sans conflit, suit vos factures et anticipe
          chaque dépense avec des rappels intelligents.
        </p>

        {/* Action Buttons Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-ink-950 text-white font-semibold text-sm sm:text-base shadow-lg shadow-ink-950/20 hover:bg-ink-900 hover:shadow-xl hover:shadow-ink-950/25 btn-premium tap-active group"
          >
            <span>Démarrer maintenant</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </Link>

          <a
            href="#product-demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-canvas-raised border border-ink-200/90 text-ink-950 font-semibold text-sm sm:text-base hover:bg-ink-100 hover:border-ink-300 btn-premium tap-active shadow-xs"
          >
            <svg
              className="w-4 h-4 text-signal"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Voir la démo du cockpit</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2.5 gap-x-8 text-xs sm:text-sm text-ink-500 font-medium">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Sans carte bancaire requise</span>
          </div>
          <span className="hidden sm:inline text-ink-300">•</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Configuration en 2 minutes</span>
          </div>
          <span className="hidden sm:inline text-ink-300">•</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Données isolées &amp; chiffrées RLS</span>
          </div>
        </div>
      </div>
    </section>
  );
}
