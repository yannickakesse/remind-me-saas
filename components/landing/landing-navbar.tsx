"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RemindMeLogo } from "./remindme-logo";
import { useTheme } from "@/components/theme/theme-provider";

interface LandingNavbarProps {
  user: { email?: string; id?: string } | null;
}

export function LandingNavbar({ user }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else setTheme("dark");
  };

  return (
    <header className="fixed top-[max(0.6rem,env(safe-area-inset-top,0px))] sm:top-4 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none transition-all duration-300">
      <div className="max-w-6xl mx-auto pointer-events-auto">
        <div
          className={`flex items-center justify-between px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-full transition-all duration-300 ${
            scrolled
              ? "bg-canvas/90 backdrop-blur-xl border border-ink-200/80 dark:border-ink-800/80 shadow-lg shadow-black/5"
              : "bg-canvas/75 backdrop-blur-md border border-ink-200/50 dark:border-ink-800/50 shadow-md shadow-black/5"
          }`}
        >
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center group shrink-0">
            <RemindMeLogo size="sm" showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-ink-700 tracking-tight">
            <a
              href="#features"
              className="hover:text-ink-950 transition-colors duration-150"
            >
              Fonctionnalités
            </a>
            <a
              href="#how-it-works"
              className="hover:text-ink-950 transition-colors duration-150"
            >
              Comment ça marche
            </a>
            <a
              href="#personas"
              className="hover:text-ink-950 transition-colors duration-150"
            >
              Pour qui ?
            </a>
            <a
              href="#pricing"
              className="hover:text-ink-950 transition-colors duration-150"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              className="hover:text-ink-950 transition-colors duration-150"
            >
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Direct Sign in / Action Pill (visible on both mobile and desktop) */}
            {user ? (
              <Link
                href="/dashboard"
                prefetch={true}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-950/20 hover:shadow transition-all duration-150 tap-active"
              >
                <span>Dashboard</span>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/login"
                prefetch={true}
                className="inline-flex items-center gap-1 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-950/20 hover:shadow transition-all duration-150 tap-active"
              >
                <span>Connexion</span>
              </Link>
            )}

            {/* Desktop Start/Register Button */}
            {!user && (
              <Link
                href="/register"
                prefetch={true}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm shadow-amber-500/20 hover:shadow transition-all duration-150 tap-active"
              >
                <span>Démarrer</span>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            )}

            {/* Language / Region indicator pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-ink-200/80 dark:border-ink-800 text-[11px] font-medium text-ink-600 dark:text-ink-400 bg-canvas/80">
              <svg className="w-3.5 h-3.5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="text-[11px] font-semibold text-ink-700 dark:text-ink-300">FR</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-full text-ink-500 hover:text-ink-950 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
              aria-label="Changer le thème"
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-full text-ink-700 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 bg-canvas-raised/95 backdrop-blur-xl border border-ink-200/80 dark:border-ink-800 rounded-3xl p-4 space-y-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-1.5 font-medium text-xs text-ink-700">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-950 transition-colors flex items-center justify-between"
              >
                <span>Fonctionnalités</span>
                <span className="text-ink-400">→</span>
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-950 transition-colors flex items-center justify-between"
              >
                <span>Comment ça marche</span>
                <span className="text-ink-400">→</span>
              </a>
              <a
                href="#personas"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-950 transition-colors flex items-center justify-between"
              >
                <span>Pour qui ?</span>
                <span className="text-ink-400">→</span>
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-950 transition-colors flex items-center justify-between"
              >
                <span>Tarifs</span>
                <span className="text-ink-400">→</span>
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-950 transition-colors flex items-center justify-between"
              >
                <span>FAQ</span>
                <span className="text-ink-400">→</span>
              </a>
            </nav>
            <div className="pt-2 border-t border-ink-100 dark:border-ink-800 flex flex-col gap-2">
              {user ? (
                <Link
                  href="/dashboard"
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full bg-emerald-600 text-white font-semibold text-xs shadow"
                >
                  Accéder au Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    prefetch={true}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-full border border-ink-300 dark:border-ink-700 text-ink-950 dark:text-white font-semibold text-xs hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/register"
                    prefetch={true}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-full bg-ink-950 dark:bg-white text-white dark:text-ink-950 font-semibold text-xs shadow shadow-ink-950/20"
                  >
                    Démarrer gratuitement
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
