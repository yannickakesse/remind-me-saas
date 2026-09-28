"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { SupportedLocale } from "@/lib/i18n/types";

interface LanguageSelectorProps {
  variant?: "pill" | "button" | "compact" | "drawer";
  className?: string;
}

export function LanguageSelector({ variant = "pill", className = "" }: LanguageSelectorProps) {
  const { locale, setLocale, locales } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLocale = locales.find((l) => l.code === locale) || locales[0] || {
    code: "fr" as SupportedLocale,
    label: "Français",
    nativeLabel: "Français",
    flag: "🇫🇷",
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (code: SupportedLocale) => {
    await setLocale(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      {variant === "pill" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Changer de langue / Change language"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-ink-200/80 dark:border-ink-800 text-[11px] font-medium text-ink-700 dark:text-ink-300 bg-canvas/90 hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all shadow-xs tap-active cursor-pointer min-h-[32px]"
        >
          <Globe className="w-3.5 h-3.5 text-signal shrink-0" strokeWidth={2} />
          <span className="text-[12px] shrink-0">{currentLocale.flag}</span>
          <span className="font-bold text-[11px] uppercase tracking-wide">{currentLocale.code}</span>
          <ChevronDown className={`w-3 h-3 text-ink-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {variant === "compact" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center justify-center p-2 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all tap-active"
          title="Changer de langue"
        >
          <Globe className="w-4 h-4 text-signal" />
          <span className="ml-1 text-xs font-bold uppercase">{currentLocale.code}</span>
        </button>
      )}

      {variant === "button" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-canvas-raised text-xs font-semibold text-ink-950 dark:text-white hover:bg-ink-50 dark:hover:bg-ink-800 active:scale-98 transition-all shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-signal shrink-0" />
            <span className="text-sm">{currentLocale.flag}</span>
            <span className="font-bold">{currentLocale.nativeLabel}</span>
            <span className="text-ink-400 font-normal">({currentLocale.label})</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Language Selection Modal / Popover */}
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal / Dropdown Content */}
          <div
            className={`
              fixed sm:absolute z-50 
              bottom-0 left-0 right-0 sm:bottom-auto sm:top-full sm:right-0 sm:left-auto sm:mt-2
              w-full sm:w-80 max-h-[85vh] sm:max-h-96
              bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-xl
              border-t sm:border border-ink-200/80 dark:border-ink-800
              rounded-t-3xl sm:rounded-2xl
              shadow-2xl sm:shadow-xl
              p-4 sm:p-3
              overflow-hidden flex flex-col
              animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-top-2 duration-200
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-ink-100 dark:border-ink-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-signal" />
                <h4 className="text-xs sm:text-sm font-bold text-ink-950 dark:text-white">
                  Sélectionner la langue / Select language
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Language Options Grid */}
            <div className="overflow-y-auto max-h-[60vh] sm:max-h-72 space-y-1 pr-1 custom-scrollbar">
              {locales.map((loc) => {
                const isSelected = loc.code === locale;
                return (
                  <button
                    key={loc.code}
                    type="button"
                    onClick={() => handleSelect(loc.code)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all tap-active ${
                      isSelected
                        ? "bg-signal-soft text-signal font-bold shadow-xs ring-1 ring-signal/30"
                        : "hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-700 dark:text-ink-300 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{loc.flag}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs truncate font-bold text-ink-950 dark:text-white">
                          {loc.nativeLabel}
                        </span>
                        <span className="text-[10px] text-ink-400 truncate">
                          {loc.label} • <span className="uppercase">{loc.code}</span>
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal text-white shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
