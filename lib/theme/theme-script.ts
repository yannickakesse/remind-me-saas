/**
 * Script anti-FOUC (Flash Of Unstyled Content) pour le thème.
 *
 * Injecté via next/script (strategy="beforeInteractive") dans app/layout.tsx
 * — s'exécute avant l'hydratation React et avant que le premier pixel ne
 * soit peint, donc avant tout flash d'un thème incorrect.
 *
 * Ne fait rien si l'utilisateur n'a jamais choisi explicitement de thème :
 * dans ce cas "system" s'applique tout seul via la media query
 * `prefers-color-scheme` définie dans app/globals.css — aucun attribut à
 * poser sur <html>.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {
    /* localStorage indisponible (navigation privée stricte, etc.) —
       on retombe silencieusement sur le thème système. */
  }
})();
`;
