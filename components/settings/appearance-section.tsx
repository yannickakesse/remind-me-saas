"use client";

import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { Globe, Check, Sun, Moon, Laptop } from "lucide-react";

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string; icon: any }[] = [
  { value: "light", label: "Clair", description: "Toujours le thème clair.", icon: Sun },
  { value: "dark", label: "Sombre", description: "Toujours le thème sombre.", icon: Moon },
  { value: "system", label: "Système", description: "Suit le réglage de votre appareil.", icon: Laptop },
];

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, locales } = useLanguage();

  return (
    <div className="max-w-2xl space-y-8">
      {/* 1. Sélecteur de Langue de l'application */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-signal" />
          <h3 className="text-sm font-bold text-ink-950">Langue d&apos;affichage</h3>
        </div>
        <p className="mb-4 text-xs text-ink-500">
          Choisissez votre langue préférée parmi plus de 10 langues internationales.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {locales.map((loc) => {
            const isSelected = loc.code === locale;
            return (
              <button
                key={loc.code}
                type="button"
                onClick={() => setLocale(loc.code)}
                aria-pressed={isSelected}
                className={`relative flex items-center justify-between p-3 rounded-xl border text-left transition-all tap-active ${
                  isSelected
                    ? "border-signal bg-signal-soft shadow-xs ring-1 ring-signal/30"
                    : "border-ink-200 hover:border-ink-300 bg-canvas-raised hover:bg-ink-50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{loc.flag}</span>
                  <div className="min-w-0 flex flex-col">
                    <span className={`text-xs truncate font-bold ${isSelected ? "text-signal" : "text-ink-950"}`}>
                      {loc.nativeLabel}
                    </span>
                    <span className="text-[10px] text-ink-400 truncate uppercase">
                      {loc.code}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal text-white shrink-0">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Thème de l'application */}
      <div className="pt-6 border-t border-ink-100">
        <h3 className="mb-1 text-sm font-bold text-ink-950">Thème de l&apos;interface</h3>
        <p className="mb-4 text-xs text-ink-500">Choisissez l&apos;apparence visuelle de l&apos;application.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                aria-pressed={isSelected}
                className={`rounded-xl border p-4 text-left transition-all tap-active ${
                  isSelected
                    ? "border-signal bg-signal-soft shadow-xs ring-1 ring-signal/30"
                    : "border-ink-200 hover:border-ink-300 bg-canvas-raised hover:bg-ink-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${isSelected ? "text-signal" : "text-ink-500"}`} />
                  {isSelected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal text-white">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="font-bold text-xs text-ink-950">{option.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-500 leading-snug">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
