/**
 * Script anti-FOUC (Flash Of Unstyled Content) pour le thème.
 *
 * Injecté via next/script (strategy="beforeInteractive") dans app/layout.tsx
 * — s'exécute avant l'hydratation React et avant que le premier pixel ne soit peint.
 *
 * Règle : un SEUL interrupteur, l'attribut data-theme sur <html>, qui pilote à la fois
 * les couleurs de base (variables CSS) et toutes les classes `dark:` de Tailwind.
 *   - aucun choix enregistré  → thème CLAIR (thème par défaut de Remind Me) ;
 *   - "light" / "dark"         → appliqué tel quel ;
 *   - "system"                 → suit le réglage du téléphone, résolu ici en light/dark.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  var theme = "light";
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      theme = stored;
    } else if (stored === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch (e) {
    /* localStorage indisponible : thème clair par défaut. */
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
`;
