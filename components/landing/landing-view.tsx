"use client";

import { useEffect } from "react";
import { LandingNavbar } from "./landing-navbar";
import { LandingHero } from "./landing-hero";
import { LandingTrustBanner } from "./landing-trust-banner";
import { LandingVideoShowcase } from "./landing-video-showcase";
import { LandingProductPreview } from "./landing-product-preview";
import { LandingComparison } from "./landing-comparison";
import { LandingFeatures } from "./landing-features";
import { LandingWorkflow } from "./landing-workflow";
import { LandingPricing } from "./landing-pricing";
import { LandingFAQ } from "./landing-faq";
import { LandingCTA } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

interface LandingViewProps {
  user: { email?: string; id?: string } | null;
}

export function LandingView({ user }: LandingViewProps) {
  useEffect(() => {
    // S'assure que le visiteur commence toujours tout en haut de la page d'accueil si pas de fragment
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink-950 dark:text-white flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 1. Header & Navigation */}
      <LandingNavbar user={user} />

      <main className="flex-1">
        {/* 2. Hero Section avec Composition Produit Réaliste */}
        <LandingHero />

        {/* 3. Bandeau de Crédibilité & Transition Fonctionnelle (4 Piliers) */}
        <LandingTrustBanner />

        {/* 4. Démonstration Produit Vidéo Officielle 45s */}
        <LandingVideoShowcase />

        {/* 5. Aperçu Produit Interactif Cockpit */}
        <LandingProductPreview />

        {/* 6. Un Seul Espace, Plus de Clarté (Comparatif Outils Fragmentés vs Écosystème Connecté) */}
        <LandingComparison />

        {/* 7. Fonctionnalités Clés : Montrer, ne pas seulement décrire (6 Modules Démontrés) */}
        <LandingFeatures />

        {/* 8. Comment ça marche (3 Étapes Concrètes) */}
        <LandingWorkflow />

        {/* 9. Tarifs & Forfaits Réels (Gratuit 0€, Pro 9€, Premium 19€) */}
        <LandingPricing />

        {/* 10. FAQ Réelle & Accessible */}
        <LandingFAQ />

        {/* 11. CTA Final de Conversion */}
        <LandingCTA />
      </main>

      {/* 12. Footer Raffiné */}
      <LandingFooter />
    </div>
  );
}
