import { DateTime } from "luxon";
import { TRANSLATIONS } from "./translations";
import type { SupportedLocale, TranslationKey } from "./types";

/**
 * Traduit une clé selon la locale demandée avec fallback automatique sur l'anglais.
 * Remplace les variables {param} par leur valeur.
 */
export function t(
  key: TranslationKey,
  locale: SupportedLocale = "en",
  params: Record<string, string | number> = {}
): string {
  const dictionary = TRANSLATIONS[locale] || TRANSLATIONS.en;
  let text = dictionary[key] || TRANSLATIONS.en[key] || key;

  for (const [paramKey, paramValue] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
  }

  return text;
}

/**
 * Formate une date ISO selon la locale et le fuseau horaire de l'utilisateur.
 */
export function formatDateLocale(
  dateISO: string,
  locale: SupportedLocale = "en",
  timezone = "UTC"
): string {
  const dt = DateTime.fromISO(dateISO, { zone: timezone }).setLocale(locale);
  if (!dt.isValid) return dateISO;

  return dt.toLocaleString(DateTime.DATE_MED);
}

/**
 * Formate une date et heure ISO selon la locale et le fuseau horaire.
 */
export function formatDateTimeLocale(
  dateISO: string,
  locale: SupportedLocale = "en",
  timezone = "UTC"
): string {
  const dt = DateTime.fromISO(dateISO, { zone: timezone }).setLocale(locale);
  if (!dt.isValid) return dateISO;

  return dt.toLocaleString(DateTime.DATETIME_MED);
}

/**
 * Formate un montant monétaire.
 */
export function formatCurrencyLocale(
  amount: number,
  currency = "EUR",
  locale: SupportedLocale = "en"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
