"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { SupportedLocale, TranslationKey } from "@/lib/i18n/types";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { TRANSLATIONS } from "@/lib/i18n/translations";

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  locales: typeof SUPPORTED_LOCALES;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "fr",
  setLocale: async () => {},
  t: (key: TranslationKey) => key,
  locales: SUPPORTED_LOCALES,
});

export function LanguageProvider({
  children,
  initialLocale = "fr",
}: {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  useEffect(() => {
    // 1. Lire depuis localStorage ou cookie si disponible
    try {
      const savedLocale = localStorage.getItem("remindme_locale") as SupportedLocale;
      if (savedLocale && SUPPORTED_LOCALES.some((l) => l.code === savedLocale)) {
        setLocaleState(savedLocale);
        applyDirection(savedLocale);
      } else {
        applyDirection(initialLocale);
      }
    } catch {
      // no-op
    }
  }, [initialLocale]);

  const applyDirection = (loc: SupportedLocale) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = loc;
      document.documentElement.dir = loc === "ar" ? "rtl" : "ltr";
    }
  };

  const setLocale = async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    applyDirection(newLocale);

    try {
      localStorage.setItem("remindme_locale", newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent("remindme:locale-change", { detail: { locale: newLocale } }));
    } catch {
      // no-op
    }
  };

  const t = (key: TranslationKey, params: Record<string, string | number> = {}): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.fr || TRANSLATIONS.en;
    let text = dict[key] || TRANSLATIONS.fr[key] || TRANSLATIONS.en[key] || key;

    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
    }
    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        locales: SUPPORTED_LOCALES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
