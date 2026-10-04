"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export const SWIPE_SECTIONS = [
  { path: "/dashboard", label: "Accueil", index: 0 },
  { path: "/calendar", label: "Calendrier", index: 1 },
  { path: "/tasks", label: "Tâches", index: 2 },
  { path: "/finances", label: "Finances", index: 3 },
] as const;

/**
 * Retourne l'index (0..3) si la route actuelle correspond exactement à une des 4 sections principales
 */
function getSectionIndex(pathname: string): number {
  if (pathname === "/dashboard") return 0;
  if (pathname === "/calendar") return 1;
  if (pathname === "/tasks") return 2;
  if (pathname === "/finances") return 3;
  return -1;
}

/**
 * Vérifie récursivement si l'élément touché est interactif ou possède un scroll horizontal propre
 */
function isInteractiveOrHorizontalScroll(element: HTMLElement | null): boolean {
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    // 1. Éléments interactifs standards & contrôles de formulaire
    const tag = current.tagName.toLowerCase();
    if (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      tag === "button" ||
      tag === "a" ||
      tag === "canvas" ||
      current.getAttribute("role") === "slider" ||
      current.getAttribute("role") === "dialog" ||
      current.getAttribute("role") === "tab" ||
      current.hasAttribute("data-no-swipe")
    ) {
      return true;
    }

    // 2. Conteneurs avec défilement horizontal local actif (ex: tables, onglets défilables, grilles de calendrier)
    if (current.scrollWidth > current.clientWidth + 8) {
      const overflowX = window.getComputedStyle(current).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") {
        return true;
      }
    }

    current = current.parentElement;
  }
  return false;
}

interface MobileSwipeNavigatorProps {
  children: React.ReactNode;
}

export function MobileSwipeNavigator({ children }: MobileSwipeNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentIndex = getSectionIndex(pathname);
  const isSwipeableRoute = currentIndex !== -1;

  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  // Références de capture du geste tactile
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isVerticalScrollRef = useRef(false);
  const isHorizontalSwipeRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  // 1. Préchargement automatique des routes adjacentes pour une transition instantanée
  useEffect(() => {
    if (!isSwipeableRoute) return;

    if (currentIndex > 0) {
      const prevSection = SWIPE_SECTIONS[currentIndex - 1];
      if (prevSection) router.prefetch(prevSection.path);
    }
    if (currentIndex < SWIPE_SECTIONS.length - 1) {
      const nextSection = SWIPE_SECTIONS[currentIndex + 1];
      if (nextSection) router.prefetch(nextSection.path);
    }
  }, [currentIndex, isSwipeableRoute, router]);

  // Réinitialiser la direction de transition après le rendu
  useEffect(() => {
    const timer = setTimeout(() => setSlideDirection(null), 250);
    return () => clearTimeout(timer);
  }, [pathname]);

  // 2. Gestionnaire d'événements tactiles avec détection de direction & tolérance stricte
  useEffect(() => {
    // Uniquement sur les appareils mobiles/tablettes (< 1024px) et sur les 4 routes principales
    if (!isSwipeableRoute || typeof window === "undefined") return;

    function handleTouchStart(e: TouchEvent) {
      if (window.innerWidth >= 1024) return;
      if (e.touches.length !== 1) return;

      const target = e.target as HTMLElement | null;
      if (isInteractiveOrHorizontalScroll(target)) {
        touchStartRef.current = null;
        return;
      }

      // Si un drawer ou modal est ouvert (body scroll verrouillé)
      if (document.body.style.overflow === "hidden") {
        touchStartRef.current = null;
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      isVerticalScrollRef.current = false;
      isHorizontalSwipeRef.current = false;
      hasNavigatedRef.current = false;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!touchStartRef.current || hasNavigatedRef.current || isVerticalScrollRef.current) {
        return;
      }

      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Fenêtre de décision rapide dès 10px de mouvement
      if (!isHorizontalSwipeRef.current && (absX > 10 || absY > 10)) {
        if (absY >= absX) {
          // L'utilisateur fait défiler la page verticalement -> verrouiller l'axe vertical pour laisser le scroll natif libre
          isVerticalScrollRef.current = true;
          return;
        } else if (absX > absY * 1.3) {
          // L'utilisateur effectue un swipe horizontal intentionnel
          isHorizontalSwipeRef.current = true;
        }
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (
        !touchStartRef.current ||
        isVerticalScrollRef.current ||
        !isHorizontalSwipeRef.current ||
        hasNavigatedRef.current
      ) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        touchStartRef.current = null;
        return;
      }

      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      touchStartRef.current = null;

      // Condition 1 : Déplacement principalement horizontal
      if (absX < absY * 1.25) return;

      // Condition 2 : Distance minimale de 55px OU geste rapide (flick velocity > 0.38 avec au moins 30px)
      const isDistancePassed = absX >= 55;
      const isQuickFlick = absX >= 30 && dt > 0 && absX / dt > 0.38;

      if (!isDistancePassed && !isQuickFlick) return;

      // Swipe Gauche (Doigt va vers la gauche => Navigation en avant)
      if (dx < 0 && currentIndex < SWIPE_SECTIONS.length - 1) {
        const targetSection = SWIPE_SECTIONS[currentIndex + 1];
        if (targetSection) {
          hasNavigatedRef.current = true;
          setSlideDirection("left");
          router.push(targetSection.path);
        }
      }
      // Swipe Droite (Doigt va vers la droite => Navigation en arrière)
      else if (dx > 0 && currentIndex > 0) {
        const targetSection = SWIPE_SECTIONS[currentIndex - 1];
        if (targetSection) {
          hasNavigatedRef.current = true;
          setSlideDirection("right");
          router.push(targetSection.path);
        }
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentIndex, isSwipeableRoute, router]);

  return (
    <div className="relative w-full min-w-0 flex flex-col">
      {/* Indicateur de position swipeable discret (Mobile uniquement sur les 4 routes) */}
      {isSwipeableRoute && (
        <div
          aria-hidden="true"
          className="md:hidden flex items-center justify-center gap-1.5 py-1 -mt-1 mb-2 select-none pointer-events-none"
        >
          {SWIPE_SECTIONS.map((sec, idx) => {
            const isActive = idx === currentIndex;
            return (
              <span
                key={sec.path}
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? "w-5 h-1.5 bg-signal shadow-2xs"
                    : "w-1.5 h-1.5 bg-ink-300/60 dark:bg-ink-700/60"
                }`}
                title={sec.label}
              />
            );
          })}
        </div>
      )}

      {/* Conteneur de page avec micro-transition fluide */}
      <div
        className={`w-full min-w-0 transition-transform duration-200 ease-out ${
          slideDirection === "left"
            ? "animate-slide-from-right"
            : slideDirection === "right"
            ? "animate-slide-from-left"
            : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
