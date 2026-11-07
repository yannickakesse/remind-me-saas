import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, type SupportedLocale } from "./types";
import { loadCatalog, translate, type TrFunction } from "./catalog";

/** Langue de l'interface côté serveur (cookie posé par le sélecteur de langue). */
export function getServerLocale(): SupportedLocale {
  // Hors d'une requête (tâche planifiée, script) il n'y a pas de cookie : français par défaut
  let value: string | undefined;
  try {
    value = cookies().get("NEXT_LOCALE")?.value;
  } catch {
    value = undefined;
  }
  return SUPPORTED_LOCALES.some((l) => l.code === value) ? (value as SupportedLocale) : "fr";
}

/** Fonction de traduction pour les composants serveur : `const tr = await getTr();` */
export async function getTr(): Promise<TrFunction> {
  const catalog = await loadCatalog(getServerLocale());
  return (source, params) => translate(catalog, source, params);
}
