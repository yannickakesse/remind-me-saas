"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Démarrer la barre de progression
  const startLoading = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);
    setProgress(15);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) return prev + 12;
        if (prev < 70) return prev + 6;
        if (prev < 88) return prev + 2;
        return prev;
      });
    }, 150);
  };

  // Terminer la barre de progression
  const finishLoading = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 300);
  };

  // Terminer dès que le chemin ou les paramètres changent
  useEffect(() => {
    finishLoading();
  }, [pathname, searchParams]);

  // Intercepter tous les clics sur les liens internes
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
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
        targetAttr !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        // Si le lien est différent de la page actuelle
        const currentPath = window.location.pathname + window.location.search;
        if (href !== currentPath) {
          startLoading();
        }
      }
    };

    // Écouter les événements personnalisés globaux si déclenchés par du code
    const handleCustomStart = () => startLoading();
    const handleCustomStop = () => finishLoading();

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("remindme:loading-start", handleCustomStart);
    window.addEventListener("remindme:loading-stop", handleCustomStop);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("remindme:loading-start", handleCustomStart);
      window.removeEventListener("remindme:loading-stop", handleCustomStop);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Barre de progression ultra-fine lumineuse en haut de l'écran */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-[999999] pointer-events-none transition-all duration-300 ease-out bg-transparent"
        style={{ opacity: loading || progress === 100 ? 1 : 0 }}
      >
        <div
          className="h-full bg-gradient-to-r from-gold via-signal to-gold-dark shadow-[0_0_12px_rgba(212,175,55,0.8),0_0_6px_rgba(245,158,11,0.6)] transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Badge flottant avec Spinner doré (avec support Safe Area pour encoches et Dynamic Island) */}
      {loading && progress < 100 && (
        <div className="fixed top-[max(1rem,env(safe-area-inset-top,0px))] right-4 z-[999999] pointer-events-none flex items-center gap-2.5 bg-ink-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gold/40 shadow-xl text-[11px] font-bold text-white animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="tracking-wide">Chargement...</span>
        </div>
      )}
    </>
  );
}
