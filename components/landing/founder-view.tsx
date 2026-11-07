"use client";

import { LandingNavbar } from "./landing-navbar";
import { LandingFooter } from "./landing-footer";
import { FounderProfile } from "./landing-founder";

/** Page « Le fondateur » : même habillage que la landing (barre du haut et pied de page). */
export function FounderView() {
  return (
    <div className="min-h-screen bg-canvas text-ink-950 dark:text-white flex flex-col font-sans transition-colors duration-300">
      <LandingNavbar user={null} />
      <main className="flex-1">
        <FounderProfile />
      </main>
      <LandingFooter />
    </div>
  );
}
