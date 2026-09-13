import type { Config } from "tailwindcss";

// Design tokens — sobre et professionnel, pensé pour la lecture de données
// financières et de plannings (pas de kit SaaS générique à cartes arrondies
// identiques : la hiérarchie vient de la typo et de l'espacement, pas de shadows).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Couleurs branchées sur les variables CSS de app/globals.css
        // (support Dark Mode — §7-8 du prompt maître). Le format
        // `rgb(var(--x) / <alpha-value>)` préserve les modificateurs
        // d'opacité Tailwind déjà utilisés dans le code (ex. bg-signal/90).
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)", // texte principal
          700: "rgb(var(--ink-700) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
        },
        canvas: {
          DEFAULT: "rgb(var(--canvas) / <alpha-value>)", // fond principal, presque blanc, pas de cream AI-cliché
          raised: "rgb(var(--canvas-raised) / <alpha-value>)",
        },
        signal: {
          // Couleur d'accent signature : Or chaud / Ambre Spel-Rebel
          DEFAULT: "rgb(var(--signal) / <alpha-value>)",
          soft: "rgb(var(--signal-soft) / <alpha-value>)",
          dark: "rgb(var(--signal-dark) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--gold) / <alpha-value>)",
          dark: "rgb(var(--gold-dark) / <alpha-value>)",
          light: "rgb(var(--gold-light) / <alpha-value>)",
          soft: "rgb(var(--gold-soft) / <alpha-value>)",
        },
        positive: {
          DEFAULT: "rgb(var(--positive) / <alpha-value>)",
          soft: "rgb(var(--positive-soft) / <alpha-value>)",
        }, // revenus reçus
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          soft: "rgb(var(--warning-soft) / <alpha-value>)",
        }, // paiements en retard / budget proche
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          soft: "rgb(var(--danger-soft) / <alpha-value>)",
        }, // conflits / dépassements
        info: {
          DEFAULT: "rgb(var(--info) / <alpha-value>)",
          soft: "rgb(var(--info-soft) / <alpha-value>)",
        }, // messages informatifs neutres
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
      },
      boxShadow: {
        gold: "0 10px 25px -5px rgba(229, 169, 30, 0.25), 0 8px 10px -6px rgba(229, 169, 30, 0.15)",
        "gold-subtle": "0 4px 14px 0 rgba(229, 169, 30, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
