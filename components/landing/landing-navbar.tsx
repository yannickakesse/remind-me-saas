"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RemindMeLogo } from "./remindme-logo";
import { useTheme } from "@/components/theme/theme-provider";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useLanguage } from "@/components/i18n/language-provider";
import { ArrowRight, Moon, Sun, Menu, X } from "lucide-react";

interface LandingNavbarProps {
  user: { email?: string; id?: string } | null;
}

export function LandingNavbar({ user }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

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

  const navLinks = [
    { href: "#features", label: "Fonctionnalités" },
    { href: "#pricing", label: "Tarifs" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header className="fixed top-[max(0.6rem,env(safe-area-inset-top,0px))] sm:top-4 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none transition-all duration-300">
      <div className="max-w-6xl mx-auto pointer-events-auto">
        <div
          className={`flex items-center justify-between px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-full transition-all duration-300 ${
            scrolled
              ? "bg-canvas/90 dark:bg-canvas-raised/90 backdrop-blur-xl border border-ink-200/80 dark:border-ink-800/80 shadow-lg shadow-black/5"
              : "bg-canvas/75 dark:bg-canvas-raised/75 backdrop-blur-md border border-ink-200/50 dark:border-ink-800/50 shadow-sm"
          }`}
        >
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg">
            <RemindMeLogo size="sm" showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-ink-700 dark:text-ink-300 tracking-tight">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-150"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Direct Sign in / Action Pill */}
            {user ? (
              <Link
                href="/dashboard"
                prefetch={true}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-950/20 hover:shadow transition-all duration-150 tap-active shrink-0"
              >
                <span>Mon Cockpit</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            ) : (
                <Link
                  href="/login"
                  prefetch={true}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold bg-[#00875A] hover:bg-emerald-700 text-white transition-colors shadow-xs shrink-0"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  prefetch={true}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm shadow-amber-500/20 hover:shadow transition-all duration-150 tap-active shrink-0"
                >
                  <span>Commencer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            )}

            {/* Language Selector */}
            <div className="hidden sm:inline-flex shrink-0">
              <LanguageSelector variant="pill" />
            </div>
            <div className="sm:hidden inline-flex shrink-0">
              <LanguageSelector variant="compact" />
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-full text-ink-500 hover:text-ink-950 dark:text-ink-400 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors shrink-0 cursor-pointer"
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
              aria-label="Changer le thème"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-full text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors shrink-0 cursor-pointer"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 bg-canvas-raised/95 backdrop-blur-xl border border-ink-200/80 dark:border-ink-800 rounded-3xl p-4 space-y-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-1 font-medium text-xs text-ink-700 dark:text-ink-200">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-950 dark:hover:text-white transition-colors flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <span className="text-ink-400">→</span>
                </a>
              ))}
            </nav>
            <div className="pt-2 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">Langue :</span>
              <LanguageSelector variant="pill" />
            </div>
            <div className="pt-2 flex flex-col gap-2">
              {user ? (
                <Link
                  href="/dashboard"
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full bg-emerald-600 text-white font-semibold text-xs shadow-sm transition-colors"
                >
                  Mon Cockpit →
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    prefetch={true}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-full border border-ink-300 dark:border-ink-700 text-ink-950 dark:text-white font-semibold text-xs hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    prefetch={true}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow shadow-amber-500/20 transition-colors"
                  >
                    Commencer gratuitement
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
