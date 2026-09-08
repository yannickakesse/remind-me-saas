"use client";

import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";

const OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: "light", label: "Clair", description: "Toujours le thème clair." },
  { value: "dark", label: "Sombre", description: "Toujours le thème sombre." },
  { value: "system", label: "Système", description: "Suit le réglage de votre appareil." },
];

/** §70 du prompt maître — changement de thème instantané et persistant. */
export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-lg">
      <h3 className="mb-1 text-sm font-semibold text-ink-950">Thème</h3>
      <p className="mb-4 text-sm text-ink-500">Choisissez l'apparence de l'application.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={theme === option.value}
            className={`rounded-lg border p-4 text-left transition-colors ${
              theme === option.value ? "border-signal bg-signal-soft" : "border-ink-100 hover:border-ink-300"
            }`}
          >
            <p className="font-medium text-ink-950">{option.label}</p>
            <p className="mt-1 text-xs text-ink-500">{option.description}</p>
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-ink-500">
        Le changement est appliqué immédiatement et mémorisé sur cet appareil.
      </p>

      {/* Bouton de secours accessible sans souris/tactile fin — cycle simple entre les 3 options. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-4"
        onClick={() => {
          const order: ThemePreference[] = ["light", "dark", "system"];
          const next = order[(order.indexOf(theme) + 1) % order.length] ?? "system";
          setTheme(next);
        }}
      >
        Basculer le thème
      </Button>
    </div>
  );
}
