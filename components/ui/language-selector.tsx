"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Globe, Check, X, Search, ChevronRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { CountryFlag } from "@/components/ui/country-flag";
import type { SupportedLocale } from "@/lib/i18n/types";

interface LanguageSelectorProps {
  /**
   * "pill" / "compact" / "button" : déclencheur compact [🌐 FR] pour les en-têtes.
   * "drawer" / "row" : ligne pleine largeur (menu mobile, Paramètres).
   */
  variant?: "pill" | "button" | "compact" | "drawer" | "row";
  className?: string;
}

/**
 * Sélecteur de langue — inspiré des SaaS de référence (Stripe, Linear, Airbnb) :
 * chaque langue est écrite dans sa propre langue, sans drapeau (une langue n'est
 * pas un pays), avec la langue suggérée par l'appareil en tête de liste.
 */
export function LanguageSelector({ variant = "pill", className = "" }: LanguageSelectorProps) {
  const { locale, setLocale, locales, t , tr } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [deviceLocale, setDeviceLocale] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDeviceLocale(navigator.language?.slice(0, 2).toLowerCase() ?? null);
    } catch {}
  }, []);

  const current = locales.find((l) => l.code === locale) ?? locales[0];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      // Sur ordinateur, focus direct sur la recherche ; sur mobile on évite d'ouvrir le clavier
      if (window.matchMedia("(min-width: 640px)").matches) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearch("");
      document.body.style.overflow = "";
      if (wasOpenRef.current) triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const suggested = useMemo(
    () => (deviceLocale && deviceLocale !== locale ? locales.find((l) => l.code === deviceLocale) ?? null : null),
    [deviceLocale, locale, locales]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return locales;
    return locales.filter(
      (l) => l.code.toLowerCase().includes(q) || l.label.toLowerCase().includes(q) || l.nativeLabel.toLowerCase().includes(q)
    );
  }, [locales, search]);

  const handleSelect = async (code: SupportedLocale) => {
    await setLocale(code);
    setIsOpen(false);
  };

  // Navigation clavier haut / bas entre les langues
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const options = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-lang-option]") ?? []);
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? Math.min(index + 1, options.length - 1) : Math.max(index - 1, 0);
    options[next]?.focus();
  };

  const triggerLabel = `${t("actions.select_language_title")} — ${current?.nativeLabel ?? ""}`;
  const isRow = variant === "drawer" || variant === "row";

  const renderOption = (loc: (typeof locales)[number]) => {
    const isSelected = loc.code === locale;
    const showSecondary = loc.label !== loc.nativeLabel;
    return (
      <button
        key={loc.code}
        type="button"
        data-lang-option
        onClick={() => handleSelect(loc.code)}
        aria-pressed={isSelected}
        lang={loc.code}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-ink-100 dark:focus-visible:bg-white/5 ${
          isSelected ? "bg-signal/10" : "hover:bg-ink-100/70 dark:hover:bg-white/5"
        }`}
      >
        <span
          className={`flex h-9 w-11 shrink-0 items-center justify-center rounded-lg border bg-canvas ${
            isSelected ? "border-signal/50" : "border-ink-200/80 dark:border-ink-800"
          }`}
        >
          <CountryFlag code={loc.countryCode || loc.code} size="lg" className="rounded-[3px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            dir={loc.direction === "rtl" ? "rtl" : undefined}
            className={`block truncate text-[15px] ${isSelected ? "font-semibold text-signal" : "font-medium text-ink-950 dark:text-white"}`}
          >
            {loc.nativeLabel}
          </span>
          {showSecondary && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{loc.label}</span>}
        </span>
        {isSelected && <Check className="h-4 w-4 shrink-0 text-signal" strokeWidth={2.5} />}
      </button>
    );
  };

  return (
    <>
      {isRow ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={triggerLabel}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-100/70 dark:hover:bg-white/5 cursor-pointer ${className}`}
        >
          <Globe className="h-[18px] w-[18px] shrink-0 text-ink-400" strokeWidth={1.8} />
          <span className="flex-1 text-[14px] font-medium text-ink-700 dark:text-ink-300">{t("settings.language_title")}</span>
          <span className="text-[13px] text-ink-500 dark:text-ink-400">{current?.nativeLabel}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={triggerLabel}
          title={triggerLabel}
          data-variant={variant}
          className={`inline-flex h-10 w-10 sm:h-9 sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-full border border-ink-200 dark:border-ink-800 bg-canvas-raised sm:px-2.5 text-xs font-bold sm:font-semibold text-ink-700 dark:text-ink-200 shadow-2xs hover:border-signal/50 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${className}`}
        >
          {/* Mobile : pastille ronde au drapeau ; à partir de sm : drapeau + ▾ */}
          {/* Drapeau de la langue active (le nom complet reste lu par les lecteurs d'écran) */}
          <CountryFlag code={current?.countryCode || current?.code || "FR"} size="sm" className="rounded-[3px]" />
          <ChevronDown className="hidden sm:block h-3 w-3 text-ink-400" />
        </button>
      )}

      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-6 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label={t("actions.select_language_title")}
          >
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

            {/* Feuille : en bas sur mobile, centrée sur ordinateur */}
            <div className="relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[28px] sm:max-w-md sm:rounded-3xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-[env(safe-area-inset-bottom)]">
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink-200 dark:bg-ink-700 sm:hidden" aria-hidden="true" />

              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-ink-950 dark:text-white">
                    {t("actions.select_language_title")}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{t("actions.language_footer_note")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={t("actions.close")}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("actions.search_language")}
                    className="w-full rounded-xl border border-ink-200 dark:border-ink-800 bg-canvas py-2.5 pl-9 pr-3 text-sm text-ink-950 dark:text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-signal/40"
                  />
                </div>
              </div>

              <div ref={listRef} onKeyDown={handleListKeyDown} className="overflow-y-auto px-3 pb-4">
                {!search && suggested && (
                  <>
                    <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                      {tr("Suggérée pour cet appareil")}</p>
                    {renderOption(suggested)}
                    <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                      {tr("Toutes les langues")}</p>
                  </>
                )}
                <div className="space-y-0.5">{filtered.map(renderOption)}</div>
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-ink-500">{tr("Aucune langue ne correspond à «")}{" "}{search} ».</p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
