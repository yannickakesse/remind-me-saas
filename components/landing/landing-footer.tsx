"use client";

import Link from "next/link";
import { RemindMeLogo } from "./remindme-logo";
import { useTheme } from "@/components/theme/theme-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSelector } from "@/components/ui/language-selector";
import { Moon, Sun, Monitor } from "lucide-react";

export function LandingFooter() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <footer className="bg-canvas border-t border-ink-200/60 dark:border-ink-800/60 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-block group">
              <RemindMeLogo size="sm" showText={true} />
            </Link>
            <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
              Un espace intelligent pour organiser ses activités multiples, maîtriser ses échéances et garder une vision claire de ses finances.
            </p>
            <div className="text-xs text-ink-500 font-mono">
              &copy; {new Date().getFullYear()} Remind Me. Tous droits réservés.
            </div>
          </div>

          {/* Navigation Links */}
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
                <a href="#comparison" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Espace unifié
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Comment ça marche
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

          {/* Authentication & Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
              Accès
            </h4>
            <ul className="space-y-2 text-xs text-ink-600 dark:text-ink-400">
              <li>
                <Link href="/login" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Se connecter
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Créer un compte gratuit
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Mot de passe oublié
                </Link>
              </li>
              <li className="pt-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Isolation stricte des données (RLS)
                </span>
              </li>
            </ul>
          </div>

          {/* Settings & Preferences */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
              Préférences
            </h4>
            <div className="space-y-2">
              <label className="text-xs text-ink-500 block">Thème d&apos;affichage</label>
              <div className="inline-flex items-center bg-canvas-raised p-1 rounded-xl border border-ink-200 dark:border-ink-800 gap-1 text-xs">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors ${
                    theme === "light"
                      ? "bg-canvas font-semibold text-ink-950 dark:text-white shadow-xs"
                      : "text-ink-600 dark:text-ink-400"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Clair</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors ${
                    theme === "dark"
                      ? "bg-canvas font-semibold text-ink-950 dark:text-white shadow-xs"
                      : "text-ink-600 dark:text-ink-400"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Sombre</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-ink-500 block">Langue de l&apos;interface</label>
              <LanguageSelector variant="pill" />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-ink-100 dark:border-ink-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-500">
          <div>
            Direction artistique : <em>Atelier Moderne & Sérénité</em>
          </div>
          <div className="flex items-center gap-6 text-[11px] font-mono">
            <span>Isolation RLS Supabase</span>
            <span>Chiffrement TLS</span>
            <span>PWA Native</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
