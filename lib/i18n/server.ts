import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, type SupportedLocale } from "./types";
import { loadCatalog, translate, type TrFunction } from "./catalog";

/** Langue de l'interface côté serveur (cookie posé par le sélecteur de langue). */
export function getServerLocale(): SupportedLocale {
  const value = cookies().get("NEXT_LOCALE")?.value;
  return SUPPORTED_LOCALES.some((l) => l.code === value) ? (value as SupportedLocale) : "fr";
}

/** Fonction de traduction pour les composants serveur : `const tr = await getTr();` */
export async function getTr(): Promise<TrFunction> {
  const catalog = await loadCatalog(getServerLocale());
  return (source, params) => translate(catalog, source, params);
}
