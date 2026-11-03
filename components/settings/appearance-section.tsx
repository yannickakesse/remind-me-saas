"use client";

import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSelector } from "@/components/ui/language-selector";
import { Globe, Check, Sun, Moon, Laptop } from "lucide-react";

const THEME_OPTIONS: { value: ThemePreference; labelKey: string; descKey: string; icon: any }[] = [
  { value: "light", labelKey: "Clair", descKey: "Toujours le thème clair.", icon: Sun },
  { value: "dark", labelKey: "Sombre", descKey: "Toujours le thème sombre.", icon: Moon },
  { value: "system", labelKey: "Système", descKey: "Suit le réglage de votre appareil.", icon: Laptop },
];

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="w-full space-y-8">
      {/* 1. Sélecteur de Langue de l'application */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-signal" />
          <h3 className="text-sm font-extrabold text-zinc-950 dark:text-white">
            {t("settings.language_title")}
          </h3>
        </div>
        <p className="mb-4 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
          {t("settings.language_desc")}
        </p>

        {/* Même sélecteur que dans l'en-tête et le menu : une seule façon de changer de langue */}
        <div className="rounded-2xl border border-ink-200/80 dark:border-ink-800 p-1">
          <LanguageSelector variant="row" />
        </div>
      </div>

      {/* 2. Thème de l'application */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="mb-1 text-sm font-extrabold text-zinc-950 dark:text-white">
          {t("settings.theme_title")}
        </h3>
        <p className="mb-4 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
          {t("settings.theme_desc")}
        </p>

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
                className={`rounded-2xl border p-4 text-left transition-all tap-active cursor-pointer ${
                  isSelected
                    ? "border-signal bg-signal/15 shadow-sm ring-2 ring-signal/30"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-signal/40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${isSelected ? "text-signal" : "text-zinc-500"}`} />
                  {isSelected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal text-white">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="font-bold text-xs text-zinc-950 dark:text-white">{option.labelKey}</p>
                <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug font-medium">{option.descKey}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
