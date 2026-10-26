"use client";

import { useEffect } from "react";
import { LandingNavbar } from "./landing-navbar";
import { LandingHero } from "./landing-hero";
import { LandingFeatures } from "./landing-features";
import { LandingPricing } from "./landing-pricing";
import { LandingFAQ } from "./landing-faq";
import { LandingCTA } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

interface LandingViewProps {
  user: { email?: string; id?: string } | null;
}

export function LandingView({ user }: LandingViewProps) {
  useEffect(() => {
    // S'assure que le visiteur commence tout en haut de la page si aucun fragment d'ancrage n'est présent
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink-950 dark:text-white flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors duration-300">
      {/* Navigation supérieure */}
      <LandingNavbar user={user} />

      <main className="flex-1">
        {/* SECTION 1 : Hero initial & SECTION 2 : Vidéo motion design intégrée */}
        <LandingHero />

        {/* SECTION 3, 4 & 5 : Fonctionnalités clés validées (Montrer n'est pas seulement décrire, Vision centralisée, Activités & Finances) */}
        <LandingFeatures />

        {/* SECTION 6 : Des forfaits clairs, sans surprise (Tarifs réels 0€, 9€, 19€) */}
        <LandingPricing />

        {/* SECTION 7 : Tout ce que vous devez savoir (FAQ) */}
        <LandingFAQ />

        {/* SECTION 8 : Appel à l'action final */}
        <LandingCTA />
      </main>

      {/* SECTION 9 : Footer */}
      <LandingFooter />
    </div>
  );
}
