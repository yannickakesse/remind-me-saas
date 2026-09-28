"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Démarrer la barre de progression instantanément
  const startLoading = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);
    setProgress(25);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + 15;
        if (prev < 75) return prev + 8;
        if (prev < 90) return prev + 3;
        return prev;
      });
    }, 120);
  }, []);

  // Terminer la barre de progression
  const finishLoading = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    const timeout = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(timeout);
  }, []);

  // Terminer dès que le chemin ou les paramètres changent
  useEffect(() => {
    finishLoading();
  }, [pathname, searchParams, finishLoading]);

  // Intercepter les clics et interactions tactiles sur les liens internes
  useEffect(() => {
    const handleNavigationTrigger = (e: Event) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      // Vérifier s'il s'agit d'un lien interne de navigation
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        !href.startsWith("/api") &&
        targetAttr !== "_blank"
      ) {
        const currentPath = window.location.pathname + window.location.search;
        if (href !== currentPath) {
          startLoading();
        }
      }
    };

    const handleCustomStart = () => startLoading();
    const handleCustomStop = () => finishLoading();

    document.addEventListener("click", handleNavigationTrigger, { capture: true });
    window.addEventListener("remindme:loading-start", handleCustomStart);
    window.addEventListener("remindme:loading-stop", handleCustomStop);

    return () => {
      document.removeEventListener("click", handleNavigationTrigger, { capture: true });
      window.removeEventListener("remindme:loading-start", handleCustomStart);
      window.removeEventListener("remindme:loading-stop", handleCustomStop);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startLoading, finishLoading]);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Barre de progression ultra-fine lumineuse en haut de l'écran */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-[999999] pointer-events-none transition-all duration-200 ease-out bg-transparent"
        style={{ opacity: loading || progress === 100 ? 1 : 0 }}
      >
        <div
          className="h-full bg-gradient-to-r from-signal via-gold to-positive shadow-[0_0_12px_rgba(245,158,11,0.8),0_0_6px_rgba(16,185,129,0.6)] transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Badge flottant avec Spinner doré instantané */}
      {loading && progress < 100 && (
        <div className="fixed top-[max(0.8rem,env(safe-area-inset-top,0px))] right-4 z-[999999] pointer-events-none flex items-center gap-2.5 bg-ink-950/90 dark:bg-canvas-raised/95 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-signal/40 shadow-2xl text-[11px] font-bold text-white animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="w-3.5 h-3.5 border-2 border-signal border-t-transparent rounded-full animate-spin" />
          <span className="tracking-wide">Chargement...</span>
        </div>
      )}
    </>
  );
}
