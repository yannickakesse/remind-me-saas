"use client";

import { useEffect } from "react";
import { LandingNavbar } from "./landing-navbar";
import { LandingHero } from "./landing-hero";
import { LandingProductPreview } from "./landing-product-preview";
import { LandingComparison } from "./landing-comparison";
import { LandingFeatures } from "./landing-features";
import { LandingWorkflow } from "./landing-workflow";
import { LandingPersonas } from "./landing-personas";
import { LandingPricing } from "./landing-pricing";
import { LandingTestimonials } from "./landing-testimonials";
import { LandingFAQ } from "./landing-faq";
import { LandingCTA } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

interface LandingViewProps {
  user: { email?: string; id?: string } | null;
}

export function LandingView({ user }: LandingViewProps) {
  useEffect(() => {
    // S'assure que le visiteur commence toujours tout en haut de la page d'accueil
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink-950 flex flex-col font-sans selection:bg-signal selection:text-white">
      {/* Navbar with auth status */}
      <LandingNavbar user={user} />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <LandingHero />

        {/* 2. Interactive Live Product Preview ("The Product As The Hero") */}
        <LandingProductPreview />

        {/* 3. Problem vs Solution Comparison */}
        <LandingComparison />

        {/* 4. Core Feature Pillars */}
        <LandingFeatures />

        {/* 5. Day-In-The-Life Workflow */}
        <LandingWorkflow />

        {/* 6. Target Personas */}
        <LandingPersonas />

        {/* 7. Pricing Matrix */}
        <LandingPricing />

        {/* 8. Testimonials & Social Proof */}
        <LandingTestimonials />

        {/* 9. FAQ Accordion */}
        <LandingFAQ />

        {/* 10. High-converting CTA */}
        <LandingCTA />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
