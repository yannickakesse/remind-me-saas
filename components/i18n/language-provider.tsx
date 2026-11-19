"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SupportedLocale, TranslationKey } from "@/lib/i18n/types";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { TRANSLATIONS } from "@/lib/i18n/translations";
import { loadCatalog, translate, type Catalog, type TrFunction } from "@/lib/i18n/catalog";

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale) => Promise<void>;
  t: (key: TranslationKey | (string & {}), params?: Record<string, string | number>) => string;
  /** Traduction par texte source : tr("Nouvelle tâche") */
  tr: TrFunction;
  locales: typeof SUPPORTED_LOCALES;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "fr",
  setLocale: async () => {},
  t: (key: TranslationKey | (string & {})) => key,
  tr: (source) => source,
  locales: SUPPORTED_LOCALES,
});

export function LanguageProvider({
  children,
  initialLocale = "fr",
  initialCatalog = {},
}: {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
  initialCatalog?: Catalog;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  const [catalog, setCatalog] = useState<Catalog>(initialCatalog);
  const catalogLocaleRef = React.useRef<SupportedLocale>(initialLocale);

  // Charge le catalogue de la langue active (une seule langue téléchargée à la fois)
  useEffect(() => {
    if (catalogLocaleRef.current === locale) return;
    let cancelled = false;
    loadCatalog(locale).then((next) => {
      if (!cancelled) {
        catalogLocaleRef.current = locale;
        setCatalog(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const tr = useCallback<TrFunction>((source, params) => translate(catalog, source, params), [catalog]);

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
        // Aucune langue choisie sur cet appareil : on adopte celle du téléphone (une seule fois),
        // enregistrée aussi côté serveur pour que les notifications arrivent dans cette langue
        const chosenBefore = document.cookie.includes("NEXT_LOCALE=") || localStorage.getItem("remindme_locale_detected");
        if (!chosenBefore) {
          localStorage.setItem("remindme_locale_detected", "1");
          const phone = (navigator.languages?.length ? navigator.languages : [navigator.language])
            .map((l) => (l || "").slice(0, 2).toLowerCase())
            .find((l) => SUPPORTED_LOCALES.some((s) => s.code === l)) as SupportedLocale | undefined;
          if (phone && phone !== initialLocale) setTimeout(() => void setLocaleRef.current?.(phone), 0);
        }
      }
    } catch {
      applyDirection(initialLocale);
    }
  }, [initialLocale, applyDirection]);

  const setLocaleRef = useRef<((l: SupportedLocale) => Promise<void>) | null>(null);
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

  setLocaleRef.current = setLocale;

  // Synchronisation : la langue affichée dans l'application est aussi celle des notifications
  // (push, e-mails, rappels). Envoyée au serveur une fois par session, ou dès qu'elle change.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("remindme_locale_synced") === locale) return;
      fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      })
        .then((r) => {
          if (r.ok) sessionStorage.setItem("remindme_locale_synced", locale);
        })
        .catch(() => {});
    } catch {}
  }, [locale]);

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        tr,
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
