"use client";

import Link from "next/link";
import { RemindMeLogo } from "./remindme-logo";
import { useTheme } from "@/components/theme/theme-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSelector } from "@/components/ui/language-selector";
import { Moon, Sun } from "lucide-react";

// Pied de page compact (esprit Stripe / Linear) : marque + liens essentiels sur une ligne,
// préférences (langue, thème) à droite, mentions sur une seconde ligne discrète.
export function LandingFooter() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const links = [
    { href: "#features", label: t("landing.nav_features") },
    { href: "#pricing", label: t("landing.nav_pricing") },
    { href: "#faq", label: t("landing.nav_faq") },
    { href: "/login", label: t("landing.nav_login") },
  ];

  return (
    <footer className="bg-canvas border-t border-ink-200/60 dark:border-ink-800/60 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <Link href="/" className="inline-flex group" aria-label="Remind Me">
              <RemindMeLogo size="sm" showText={true} />
            </Link>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600 dark:text-ink-400">
              {links.map((l) =>
                l.href.startsWith("#") ? (
                  <a key={l.href} href={l.href} className="hover:text-ink-950 dark:hover:text-white transition-colors">
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.href} href={l.href} className="hover:text-ink-950 dark:hover:text-white transition-colors">
                    {l.label}
                  </Link>
                )
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector variant="pill" />
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={t("footer.theme_label")}
              title={t("footer.theme_label")}
              className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-ink-200 dark:border-ink-800 bg-canvas-raised text-ink-600 dark:text-ink-300 hover:border-signal/50 transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-ink-200/60 dark:border-ink-800/60 text-xs text-ink-500">
          &copy; {new Date().getFullYear()} Remind Me
        </div>
      </div>
    </footer>
  );
}
