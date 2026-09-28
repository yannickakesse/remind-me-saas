"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { WifiOff, RefreshCw, Smartphone, AlertCircle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import Link from "next/link";

export default function OfflinePage() {
  const { locale, t } = useLanguage();
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRetry = async () => {
    setIsChecking(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/favicon.ico?_ping=" + Date.now(), {
        method: "HEAD",
        cache: "no-store",
      });

      if (res.ok || res.status === 304) {
        setIsSuccess(true);
        setStatusMessage(
          locale === "fr"
            ? "Connexion rétablie ! Redirection..."
            : "Connection restored! Reloading..."
        );
        setTimeout(() => {
          window.location.href = "/";
        }, 700);
        return;
      }
    } catch {
      // offline
    }

    setIsChecking(false);
    setIsSuccess(false);
    setStatusMessage(
      locale === "fr"
        ? "Impossible de joindre le serveur. Vérifiez votre connexion."
        : "Unable to reach server. Please check your network connection."
    );
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsSuccess(true);
      setStatusMessage(
        locale === "fr"
          ? "Connexion rétablie ! Chargement en cours..."
          : "Connection restored! Loading..."
      );
      setTimeout(() => {
        window.location.reload();
      }, 700);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [locale]);

  return (
    <div className="min-h-screen bg-canvas-base dark:bg-canvas-base text-ink-900 dark:text-ink-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-brand-primary/10 dark:bg-brand-primary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-canvas-card/90 dark:bg-canvas-card/85 backdrop-blur-xl border border-ink-100 dark:border-ink-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Animated Brand Header */}
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/40 animate-ping opacity-60" />
          <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-primary to-emerald-700 flex items-center justify-center shadow-lg shadow-brand-primary/30 border-2 border-white/20 overflow-hidden">
            <Image
              src="/icons/icon-192x192.png"
              alt="Remind Me"
              width={80}
              height={80}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        {/* Offline Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>{locale === "fr" ? "Mode Hors-ligne" : "Offline Mode"}</span>
        </div>

        {/* Main Headings */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 text-ink-900 dark:text-ink-50">
          {locale === "fr" ? "Pas de connexion Internet" : "No Internet Connection"}
        </h1>

        <p className="text-sm text-ink-600 dark:text-ink-400 mb-6 leading-relaxed">
          {locale === "fr"
            ? "Veuillez vous connecter au Wi-Fi ou aux données cellulaires pour accéder aux fonctionnalités de Remind Me et synchroniser vos rappels."
            : "Please connect to Wi-Fi or mobile cellular data to access Remind Me services and sync your reminders."}
        </p>

        {/* Action button */}
        <button
          onClick={handleRetry}
          disabled={isChecking}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-gradient-to-r from-brand-primary to-emerald-600 hover:from-brand-primary-hover hover:to-emerald-700 text-white font-semibold text-sm sm:text-base shadow-lg shadow-brand-primary/25 active:scale-[0.98] transition-all disabled:opacity-75 cursor-pointer"
        >
          <RefreshCw
            className={`w-5 h-5 ${isChecking ? "animate-spin" : ""}`}
          />
          <span>
            {isChecking
              ? locale === "fr"
                ? "Vérification en cours..."
                : "Checking connection..."
              : locale === "fr"
              ? "Réessayer la connexion"
              : "Retry Connection"}
          </span>
        </button>

        {/* Feedback message */}
        {statusMessage && (
          <div
            className={`mt-4 text-xs font-medium px-3 py-2 rounded-lg ${
              isSuccess
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
            }`}
          >
            {statusMessage}
          </div>
        )}

        {/* Troubleshooting Hints Box */}
        <div className="mt-6 p-3.5 rounded-2xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-100 dark:border-ink-800 text-left text-xs text-ink-600 dark:text-ink-400">
          <div className="font-semibold text-ink-800 dark:text-ink-200 mb-2 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-brand-primary" />
            <span>
              {locale === "fr" ? "Astuces rapides :" : "Quick tips:"}
            </span>
          </div>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              {locale === "fr"
                ? "Vérifiez que le Wi-Fi ou la 4G/5G sont activés."
                : "Ensure Wi-Fi or mobile data is turned on."}
            </li>
            <li>
              {locale === "fr"
                ? "Basculez le Mode Avion (Activer puis Désactiver)."
                : "Toggle Airplane mode on and off."}
            </li>
            <li>
              {locale === "fr"
                ? "L'application se rechargera automatiquement dès le retour du réseau."
                : "The app will auto-reload as soon as internet is restored."}
            </li>
          </ul>
        </div>

        {/* Back Link */}
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{locale === "fr" ? "Retour à l'accueil" : "Back to Home"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
