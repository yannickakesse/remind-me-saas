import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";

export function LandingCTA() {
  return (
    <section className="py-24 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-signal via-signal/95 to-ink-950 p-8 sm:p-14 lg:p-20 text-white shadow-2xl shadow-signal/25 overflow-hidden text-center">
          {/* Decorative Backdrops */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-positive/20 rounded-full blur-2xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-gold-light" />
              Prise en main en 2 minutes chrono
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-sans">
              Prêt à reprendre le contrôle de votre temps et de vos revenus ?
            </h2>

            <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
              Rejoignez dès aujourd&apos;hui les centaines de pluriactifs, consultants et indépendants qui ont simplifié leur organisation avec Remind Me.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-ink-950 font-bold text-base shadow-xl hover:bg-white/95 hover:scale-[1.02] transition-all duration-150 tap-active"
              >
                <span>Créer mon compte gratuit</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-base border border-white/20 backdrop-blur-sm transition-colors tap-active"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>

            <p className="text-xs text-white/60 pt-2">
              Gratuit pour toujours jusqu&apos;à 2 activités • Aucune carte bancaire requise
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
