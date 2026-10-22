"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function LandingCTA() {
  return (
    <section className="py-24 sm:py-32 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-ink-950 via-slate-900 to-amber-950 p-8 sm:p-14 lg:p-20 text-white shadow-2xl shadow-ink-950/20 overflow-hidden text-center border border-white/10">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Prêt en 2 minutes</span>
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-sans text-white">
              Une organisation plus claire commence ici.
            </h2>

            <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
              Rejoignez les professionnels et pluriactifs qui ont fait le choix d&apos;un centre de contrôle unique pour leurs activités, leurs échéances et leurs finances.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all duration-150 tap-active group"
              >
                <span>Commencer gratuitement</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-base border border-white/20 backdrop-blur-sm transition-colors tap-active"
              >
                Se connecter
              </Link>
            </div>

            <p className="text-xs text-white/60 pt-2 font-mono">
              Forfait gratuit disponible immédiatement • Sans carte bancaire requise
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
