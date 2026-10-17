"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SupportedLocale, TranslationKey } from "@/lib/i18n/types";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { TRANSLATIONS } from "@/lib/i18n/translations";

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale) => Promise<void>;
  t: (key: TranslationKey | (string & {}), params?: Record<string, string | number>) => string;
  locales: typeof SUPPORTED_LOCALES;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "fr",
  setLocale: async () => {},
  t: (key: TranslationKey | (string & {})) => key,
  locales: SUPPORTED_LOCALES,
});

export function LanguageProvider({
  children,
  initialLocale = "fr",
}: {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  const applyDirection = useCallback((loc: SupportedLocale) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = loc;
      document.documentElement.dir = loc === "ar" ? "rtl" : "ltr";
    }
  }, []);

  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem("remindme_locale") as SupportedLocale;
      if (savedLocale && SUPPORTED_LOCALES.some((l) => l.code === savedLocale)) {
        setLocaleState(savedLocale);
        applyDirection(savedLocale);
      } else {
        applyDirection(initialLocale);
      }
    } catch {
      applyDirection(initialLocale);
    }
  }, [initialLocale, applyDirection]);

  const setLocale = async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    applyDirection(newLocale);

    try {
      localStorage.setItem("remindme_locale", newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(
        new CustomEvent("remindme:locale-change", { detail: { locale: newLocale } })
      );

      // Enregistrement asynchrone côté serveur pour persistance cross-device
      fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      }).catch(() => {});

      // Rafraîchir les server components
      router.refresh();
    } catch {
      // no-op
    }
  };

  const t = useCallback(
    (key: TranslationKey | (string & {}), params: Record<string, string | number> = {}): string => {
      const dict = TRANSLATIONS[locale] || TRANSLATIONS.fr || TRANSLATIONS.en;

      let lookupKey = key;
      if (params.count !== undefined) {
        try {
          const pr = new Intl.PluralRules(locale);
          const form = pr.select(Number(params.count));
          const candidate = `${key}_${form}` as TranslationKey;
          if (dict[candidate] || TRANSLATIONS.fr[candidate] || TRANSLATIONS.en[candidate]) {
            lookupKey = candidate;
          } else {
            const otherCandidate = `${key}_other` as TranslationKey;
            if (dict[otherCandidate] || TRANSLATIONS.fr[otherCandidate] || TRANSLATIONS.en[otherCandidate]) {
              lookupKey = otherCandidate;
            }
          }
        } catch {
          // fallback
        }
      }

      const k = lookupKey as TranslationKey;
      let text = dict[k] || TRANSLATIONS.fr[k] || TRANSLATIONS.en[k] || lookupKey;

      for (const [pKey, pVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
      }
      return text;
    },
    [locale]
  );

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
