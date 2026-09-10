"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else setTheme("dark");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-canvas/85 backdrop-blur-md border-b border-ink-100 shadow-sm py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-signal via-signal/90 to-signal-soft/40 flex items-center justify-center text-white shadow-md shadow-signal/20 group-hover:scale-105 transition-transform duration-200">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-ink-950 font-sans">
                  Remind<span className="text-signal">Me</span>
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-signal-soft text-signal">
                  SaaS
                </span>
              </div>
              <span className="text-[11px] text-ink-500 font-medium hidden sm:inline-block">
                Multi-Activity OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-700">
            <a
              href="#features"
              className="hover:text-signal transition-colors duration-150"
            >
              Fonctionnalités
            </a>
            <a
              href="#how-it-works"
              className="hover:text-signal transition-colors duration-150"
            >
              Comment ça marche
            </a>
            <a
              href="#personas"
              className="hover:text-signal transition-colors duration-150"
            >
              Pour qui ?
            </a>
            <a
              href="#pricing"
              className="hover:text-signal transition-colors duration-150"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              className="hover:text-signal transition-colors duration-150"
            >
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-ink-500 hover:text-ink-950 hover:bg-ink-100 transition-colors"
              title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              aria-label="Changer le thème"
            >
              {theme === "dark" ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-white font-medium text-sm hover:bg-signal/90 shadow-sm transition-all duration-150 tap-active"
              >
                <span>Accéder au Dashboard</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-ink-700 hover:text-ink-950 hover:bg-ink-100 transition-colors"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-signal text-white font-medium text-sm hover:bg-signal/90 shadow-sm shadow-signal/25 hover:shadow-md transition-all duration-150 tap-active"
                >
                  <span>Démarrer l&apos;essai</span>
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
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-ink-500 hover:text-ink-950 hover:bg-ink-100 transition-colors"
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

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-canvas-raised border-b border-ink-100 px-4 pt-3 pb-6 space-y-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 font-medium text-ink-700">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-ink-100 hover:text-signal transition-colors"
            >
              Fonctionnalités
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-ink-100 hover:text-signal transition-colors"
            >
              Comment ça marche
            </a>
            <a
              href="#personas"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-ink-100 hover:text-signal transition-colors"
            >
              Pour qui ?
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-ink-100 hover:text-signal transition-colors"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-ink-100 hover:text-signal transition-colors"
            >
              FAQ
            </a>
          </nav>
          <div className="pt-3 border-t border-ink-100 flex flex-col gap-2.5">
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-signal text-white font-medium text-sm shadow"
              >
                Accéder au Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg border border-ink-300 text-ink-950 font-medium text-sm hover:bg-ink-100"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-signal text-white font-medium text-sm shadow shadow-signal/25"
                >
                  Démarrer gratuitement
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
