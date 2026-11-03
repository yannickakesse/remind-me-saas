import type { SupportedLocale } from "../types";

/**
 * Catalogues de traduction « texte source → traduction » (style gettext).
 * Le texte source (le plus souvent en français) sert de clé : dans le code on écrit
 * simplement tr("Nouvelle tâche"). Les fichiers <langue>.json sont remplis
 * automatiquement par `npm run i18n:translate` (DeepL) — ne pas les éditer à la main,
 * sauf pour corriger une traduction précise.
 */
export type Catalog = Record<string, string>;
export type TrParams = Record<string, string | number>;
export type TrFunction = (source: string, params?: TrParams) => string;

const loaders: Record<SupportedLocale, () => Promise<{ default: Catalog }>> = {
  fr: () => import("./fr.json"),
  en: () => import("./en.json"),
  es: () => import("./es.json"),
  de: () => import("./de.json"),
  pt: () => import("./pt.json"),
  it: () => import("./it.json"),
  nl: () => import("./nl.json"),
  ru: () => import("./ru.json"),
  zh: () => import("./zh.json"),
  ja: () => import("./ja.json"),
  ar: () => import("./ar.json"),
  hi: () => import("./hi.json"),
};

/** Charge le catalogue d'une langue (chargé à la demande : une seule langue par visiteur). */
export async function loadCatalog(locale: SupportedLocale): Promise<Catalog> {
  try {
    const mod = await (loaders[locale] ?? loaders.fr)();
    return mod.default ?? {};
  } catch {
    return {};
  }
}

/** Traduit un texte source ; sans traduction disponible, le texte source est affiché. */
export function translate(catalog: Catalog, source: string, params?: TrParams): string {
  let text = catalog[source] || source;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      text = text.split(`{${key}}`).join(String(value));
    }
  }
  return text;
}

/**
 * Marque un texte défini hors d'un composant (liste de statuts, constante…) pour qu'il soit
 * collecté et traduit par le script. Il sera traduit à l'affichage avec tr(...).
 */
export const msg = (source: string): string => source;
