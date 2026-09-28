"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { locale } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(window.navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowReconnected(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/favicon.ico?_ping=" + Date.now(), {
        method: "HEAD",
        cache: "no-store",
      });
      if (res.ok || res.status === 304) {
        setIsOnline(true);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 4000);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Offline banner (floating sleek pill on top, touch friendly)
  if (!isOnline) {
    return (
      <aside
        aria-live="assertive"
        role="alert"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md bg-amber-500/95 dark:bg-amber-600/95 text-ink-950 font-medium text-xs sm:text-sm py-2.5 px-4 rounded-2xl shadow-xl shadow-amber-950/20 backdrop-blur-md border border-amber-400/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 flex items-center justify-center">
            <span className="absolute w-3 h-3 rounded-full bg-red-600 animate-ping opacity-75" />
            <WifiOff className="w-4 h-4 text-ink-950 relative z-10 shrink-0" />
          </div>
          <p className="truncate font-semibold text-ink-950 text-xs sm:text-sm">
            {locale === "fr"
              ? "Connexion perdue • Mode hors-ligne"
              : locale === "es"
              ? "Sin conexión • Modo sin conexión"
              : locale === "de"
              ? "Keine Verbindung • Offline-Modus"
              : locale === "ar"
              ? "انقطع الاتصال • وضع عدم الاتصال"
              : "Connection lost • Offline mode"}
          </p>
        </div>

        <button
          onClick={handleManualCheck}
          disabled={isChecking}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-ink-950/15 hover:bg-ink-950/25 active:bg-ink-950/30 text-ink-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          title="Vérifier la connexion"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">
            {locale === "fr" ? "Tester" : "Retry"}
          </span>
        </button>
      </aside>
    );
  }

  // Reconnected banner
  if (showReconnected) {
    return (
      <aside
        aria-live="polite"
        role="status"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md bg-emerald-600/95 text-white font-medium text-xs sm:text-sm py-2.5 px-4 rounded-2xl shadow-xl shadow-emerald-950/20 backdrop-blur-md border border-emerald-400/40 flex items-center justify-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <Wifi className="w-4 h-4 text-white shrink-0 animate-bounce" />
        <span className="font-semibold text-xs sm:text-sm">
          {locale === "fr"
            ? "Connexion Internet rétablie avec succès"
            : locale === "es"
            ? "Conexión a Internet restablecida"
            : locale === "de"
            ? "Internetverbindung wiederhergestellt"
            : locale === "ar"
            ? "تمت استعادة الاتصال بالإنترنت بنجاح"
            : "Internet connection restored successfully"}
        </span>
      </aside>
    );
  }

  return null;
}
