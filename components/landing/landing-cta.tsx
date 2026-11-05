"use client";


import { useLanguage } from "@/components/i18n/language-provider";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function LandingCTA() {
  const { tr } = useLanguage();
  return (
    <section className="py-20 sm:py-28 bg-canvas">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-ink-950 via-slate-900 to-amber-950 p-8 sm:p-14 lg:p-18 text-white shadow-2xl shadow-ink-950/20 overflow-hidden text-center border border-white/10">
          {/* Lueur subtile en arrière-plan */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{tr("Prêt en 2 minutes")}</span>
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-sans text-white leading-tight">
              {tr("Une organisation plus claire commence ici.")}</h2>

            <p className="text-base sm:text-lg text-white/80 leading-relaxed font-normal">
              {tr("Rejoignez les professionnels et pluriactifs qui ont fait le choix d’un centre de contrôle unique pour leurs activités, leurs échéances et leurs finances.")}</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <Link
                href="/register"
                className="w-full max-w-xs sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm tracking-tight shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all duration-150 group cursor-pointer"
              >
                <span>{tr("Commencer gratuitement")}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/login"
                className="w-full max-w-xs sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/25 backdrop-blur-sm transition-colors cursor-pointer"
              >
                {tr("Se connecter")}</Link>
            </div>

            <p className="text-xs text-white/60 pt-2 font-mono">
              {tr("Forfait gratuit disponible immédiatement • Sans carte bancaire requise")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
