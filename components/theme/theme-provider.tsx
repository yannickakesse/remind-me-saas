"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  /** Préférence choisie par l'utilisateur (« light » par défaut). */
  theme: ThemePreference;
  /** Change et persiste la préférence, applique immédiatement l'attribut sur <html>. */
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";

/** « system » est résolu en light/dark : l'attribut data-theme est TOUJOURS posé (un seul interrupteur). */
function resolveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeAttribute(theme: ThemePreference) {
  document.documentElement.setAttribute("data-theme", resolveTheme(theme));
}

/**
 * Fournit le thème (light/dark/system) à toute l'application.
 * L'attribut data-theme est déjà posé au chargement par le script
 * anti-FOUC (lib/theme/theme-script.ts) — ce provider prend ensuite le
 * relais pour permettre un changement en direct (ex. futur toggle dans
 * Paramètres > Apparence, §70 du prompt maître).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const pref: ThemePreference = stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
      setThemeState(pref);
      // Sécurité : réapplique l'attribut si le rendu React l'a remis à sa valeur serveur
      applyThemeAttribute(pref);
    } catch {
      // localStorage indisponible — reste sur le thème clair.
    }
  }, []);

  // « Système » : suivre en direct un changement de réglage du téléphone
  useEffect(() => {
    if (theme !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeAttribute("system");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    applyThemeAttribute(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
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
