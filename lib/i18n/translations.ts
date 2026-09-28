import type { SupportedLocale, TranslationKey } from "./types";
import { fr } from "./locales/fr";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { de } from "./locales/de";
import { pt } from "./locales/pt";
import { it } from "./locales/it";
import { nl } from "./locales/nl";
import { ru } from "./locales/ru";
import { zh } from "./locales/zh";
import { ja } from "./locales/ja";
import { ar } from "./locales/ar";
import { hi } from "./locales/hi";

export const TRANSLATIONS: Record<SupportedLocale, Record<TranslationKey, string>> = {
  fr,
  en,
  es,
  de,
  pt,
  it,
  nl,
  ru,
  zh,
  ja,
  ar,
  hi,
};
