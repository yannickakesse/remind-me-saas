"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Globe, Check, ChevronDown, X, Search } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { SupportedLocale } from "@/lib/i18n/types";

interface LanguageSelectorProps {
  variant?: "pill" | "button" | "compact" | "drawer";
  className?: string;
}

export function LanguageSelector({
  variant = "pill",
  className = "",
}: LanguageSelectorProps) {
  const { locale, setLocale, locales, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLocale = locales.find((l) => l.code === locale) || locales[0] || {
    code: "fr" as SupportedLocale,
    label: "Français",
    nativeLabel: "Français",
    flag: "🇫🇷",
  };

  // Keyboard shortcut (Escape to close) & Auto-focus search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      setSearch("");
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filteredLocales = useMemo(() => {
    if (!search.trim()) return locales;
    const q = search.toLowerCase().trim();
    return locales.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.label.toLowerCase().includes(q) ||
        l.nativeLabel.toLowerCase().includes(q)
    );
  }, [locales, search]);

  const handleSelect = async (code: SupportedLocale) => {
    await setLocale(code);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button Variants */}
      {variant === "pill" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-label="Changer de langue / Change language"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xs tap-active cursor-pointer min-h-[32px] ${className}`}
        >
          <Globe className="w-3.5 h-3.5 text-signal shrink-0" strokeWidth={2.2} />
          <span className="text-[13px] leading-none shrink-0">{currentLocale.flag}</span>
          <span className="font-bold uppercase tracking-wider text-[11px] text-slate-900 dark:text-white">
            {currentLocale.code}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>
      )}

      {variant === "compact" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          className={`flex items-center gap-1 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all tap-active ${className}`}
          title="Changer de langue"
        >
          <Globe className="w-4 h-4 text-signal" strokeWidth={2} />
          <span className="text-xs font-bold uppercase">{currentLocale.code}</span>
        </button>
      )}

      {variant === "button" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-signal/50 hover:bg-signal-soft/10 active:scale-98 transition-all shadow-xs tap-active ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-soft text-signal shrink-0">
              <Globe className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{currentLocale.flag}</span>
                <span className="font-bold text-xs sm:text-sm text-slate-950 dark:text-white truncate">
                  {currentLocale.nativeLabel}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {currentLocale.code}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate">{currentLocale.label}</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      )}

      {variant === "drawer" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 transition-all ${className}`}
        >
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-signal shrink-0" strokeWidth={1.8} />
            <span>{t("nav.language")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{currentLocale.flag}</span>
            <span className="text-xs font-bold uppercase text-slate-900 dark:text-white">{currentLocale.code}</span>
          </div>
        </button>
      )}

      {/* Portal-rendered Centered Modal Dialog — Guaranteed 100% Opaque & Never Clipped */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Sélection de la langue"
          >
            {/* Dark Opaque Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Card — Fully Opaque Solid Background */}
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] z-10 opacity-100 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-soft text-signal">
                    <Globe className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                      {t("actions.select_language_title")}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {t("actions.select_language_subtitle")}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fermer"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-5 pt-3.5 pb-1.5 bg-white dark:bg-slate-900">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("actions.search_language")}
                    className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-signal/40 transition-all"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Languages Grid */}
              <div className="p-4 sm:p-5 overflow-y-auto max-h-[50vh] space-y-2 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredLocales.map((loc) => {
                    const isSelected = loc.code === locale;
                    return (
                      <button
                        key={loc.code}
                        type="button"
                        onClick={() => handleSelect(loc.code)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all tap-active cursor-pointer ${
                          isSelected
                            ? "border-signal bg-amber-50/80 dark:bg-amber-950/30 text-signal font-bold shadow-xs ring-2 ring-signal/30"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 hover:border-signal/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl shrink-0 drop-shadow-xs">{loc.flag}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white truncate">
                              {loc.nativeLabel}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                              <span>{loc.label}</span>
                              <span>•</span>
                              <span className="uppercase font-bold text-[10px] text-slate-500 dark:text-slate-300">
                                {loc.code}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-white shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {filteredLocales.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Aucune langue ne correspond à votre recherche.
                  </div>
                )}
              </div>

              {/* Footer Note */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                <p className="truncate">{t("actions.language_footer_note")}</p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                  {t("actions.close")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
