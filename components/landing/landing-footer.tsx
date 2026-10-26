"use client";

import Link from "next/link";
import { RemindMeLogo } from "./remindme-logo";
import { useTheme } from "@/components/theme/theme-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSelector } from "@/components/ui/language-selector";
import { Moon, Sun } from "lucide-react";

export function LandingFooter() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <footer className="bg-canvas border-t border-ink-200/60 dark:border-ink-800/60 py-16 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Informations sur la marque */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-block group">
              <RemindMeLogo size="sm" showText={true} />
            </Link>
            <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
              Un espace intelligent pour organiser vos activités, maîtriser vos échéances
              et garder une vision limpide de vos finances.
            </p>
            <div className="text-xs text-ink-500 font-mono">
              &copy; {new Date().getFullYear()} Remind Me. Tous droits réservés.
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
              Découvrir
            </h4>
            <ul className="space-y-2 text-xs text-ink-600 dark:text-ink-400">
              <li>
                <a href="#features" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Fonctionnalités clés
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Tarifs & forfaits
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Questions fréquentes
                </a>
              </li>
            </ul>
          </div>

          {/* Accès rapide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
              Accès
            </h4>
            <ul className="space-y-2 text-xs text-ink-600 dark:text-ink-400">
              <li>
                <Link href="/register" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Créer un compte gratuit
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Se connecter
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Accéder à mon espace
                </Link>
              </li>
            </ul>
          </div>

          {/* Paramètres */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
              Paramètres
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LanguageSelector variant="pill" />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-raised border border-ink-200 dark:border-ink-800 text-xs font-medium text-ink-950 dark:text-white hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
                >
                  {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ligne inférieure */}
        <div className="pt-8 border-t border-ink-200/60 dark:border-ink-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-500">
          <p>Données chiffrées & isolées selon les politiques de sécurité RLS Supabase.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink-950 dark:hover:text-white transition-colors">
              Confidentialité
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-ink-950 dark:hover:text-white transition-colors">
              Conditions d'utilisation
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
