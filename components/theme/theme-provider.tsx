"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  /** Préférence choisie par l'utilisateur (ou "system" par défaut). */
  theme: ThemePreference;
  /** Change et persiste la préférence, applique immédiatement l'attribut sur <html>. */
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";

function applyThemeAttribute(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

/**
 * Fournit le thème (light/dark/system) à toute l'application.
 * L'attribut data-theme est déjà posé au chargement par le script
 * anti-FOUC (lib/theme/theme-script.ts) — ce provider prend ensuite le
 * relais pour permettre un changement en direct (ex. futur toggle dans
 * Paramètres > Apparence, §70 du prompt maître).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    } catch {
      // localStorage indisponible — reste sur "system".
    }
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    applyThemeAttribute(next);
    try {
      if (next === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Rien à faire : le thème reste appliqué pour la session en cours.
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Lit/modifie la préférence de thème courante. Doit être utilisé sous ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé à l'intérieur de <ThemeProvider>.");
  return ctx;
}
