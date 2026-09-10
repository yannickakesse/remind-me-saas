"use client";

import Link from "next/link";
import { RemindMeLogo } from "./remindme-logo";
import { useTheme } from "@/components/theme/theme-provider";

export function LandingFooter() {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="bg-canvas border-t border-ink-200/60 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-block group">
              <RemindMeLogo size="sm" showText={true} />
            </Link>
            <p className="text-xs text-ink-500 leading-relaxed">
              Une référence pour les pluriactifs et les indépendants. Votre travail, votre temps et votre argent enfin sous contrôle.
            </p>
            <div className="text-xs text-ink-500 font-mono">
              &copy; {new Date().getFullYear()} Remind Me Inc.
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950">
              Produit
            </h4>
            <ul className="space-y-2 text-xs text-ink-700">
              <li>
                <a href="#features" className="hover:text-signal transition-colors">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-signal transition-colors">
                  Comment ça marche
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-signal transition-colors">
                  Tarifs &amp; Plans
                </a>
              </li>
              <li>
                <a href="#product-demo" className="hover:text-signal transition-colors">
                  Démo interactive
                </a>
              </li>
            </ul>
          </div>

          {/* Authentication Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950">
              Accès &amp; Sécurité
            </h4>
            <ul className="space-y-2 text-xs text-ink-700">
              <li>
                <Link href="/login" className="hover:text-signal transition-colors">
                  Connexion
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-signal transition-colors">
                  Inscription gratuite
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-signal transition-colors">
                  Mot de passe oublié
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-positive font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                  Isolation RLS Active
                </span>
              </li>
            </ul>
          </div>

          {/* Theme & Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950">
              Préférences
            </h4>
            <div className="space-y-2">
              <label className="text-xs text-ink-500 block">Thème d&apos;affichage</label>
              <div className="inline-flex items-center bg-ink-100 p-1 rounded-lg gap-1 text-xs">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-2.5 py-1 rounded ${
                    theme === "light" ? "bg-canvas-raised font-semibold text-ink-950 shadow-sm" : "text-ink-700"
                  }`}
                >
                  Clair
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-2.5 py-1 rounded ${
                    theme === "dark" ? "bg-canvas-raised font-semibold text-ink-950 shadow-sm" : "text-ink-700"
                  }`}
                >
                  Sombre
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`px-2.5 py-1 rounded ${
                    theme === "system" ? "bg-canvas-raised font-semibold text-ink-950 shadow-sm" : "text-ink-700"
                  }`}
                >
                  Système
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-ink-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-500">
          <div>
            Remind Me — Fait pour ceux qui valorisent leur temps et leur liberté.
          </div>
          <div className="flex items-center gap-6">
            <span>Conforme RGPD</span>
            <span>Chiffrement TLS 1.3</span>
            <span>PostgreSQL RLS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
