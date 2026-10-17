import { DateTime } from "luxon";
import { TRANSLATIONS } from "./translations";
import type { SupportedLocale, TranslationKey } from "./types";

/**
 * Traduit une clé selon la locale demandée avec gestion native des pluriels (Intl.PluralRules),
 * remplacement des variables {param} et fallback intelligent sur fr/en.
 */
export function t(
  key: TranslationKey | (string & {}),
  locale: SupportedLocale = "fr",
  params: Record<string, string | number> = {}
): string {
  const dictionary = TRANSLATIONS[locale] || TRANSLATIONS.fr || TRANSLATIONS.en;

  let lookupKey = key;
  if (params.count !== undefined) {
    try {
      const pr = new Intl.PluralRules(locale);
      const form = pr.select(Number(params.count)); // 'one', 'other', 'few', 'many', etc.
      const candidate = `${key}_${form}` as TranslationKey;
      if (dictionary[candidate] || TRANSLATIONS.fr[candidate] || TRANSLATIONS.en[candidate]) {
        lookupKey = candidate;
      } else {
        const otherCandidate = `${key}_other` as TranslationKey;
        if (dictionary[otherCandidate] || TRANSLATIONS.fr[otherCandidate] || TRANSLATIONS.en[otherCandidate]) {
          lookupKey = otherCandidate;
        }
      }
    } catch {
      // no-op
    }
  }

  const k = lookupKey as TranslationKey;
  let text = dictionary[k] || TRANSLATIONS.fr[k] || TRANSLATIONS.en[k] || lookupKey;

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
