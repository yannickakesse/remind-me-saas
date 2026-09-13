"use client";

import { useEffect, useState, useRef } from "react";
import { Wallet, CheckSquare, Bell, Check, Circle } from "lucide-react";

export function FloatingEcosystem() {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only enable mouse parallax on desktop / non-touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Limit amplitude to 6px maximum
      const deltaX = Math.max(-6, Math.min(6, (e.clientX - centerX) / 45));
      const deltaY = Math.max(-6, Math.min(6, (e.clientY - centerY) / 45));

      setMouseOffset({ x: deltaX, y: deltaY });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-visible z-20 select-none"
    >
      {/* =========================================================================
          A. HORLOGE / CLOCK (TIME)
          Position: Haut Gauche au-dessus du Dashboard
          ========================================================================= */}
      <div
        style={{
          transform: `translate3d(${mouseOffset.x * 0.8}px, ${mouseOffset.y * 0.8}px, 0)`,
        }}
        className="hidden md:flex absolute -top-8 left-4 lg:left-8 animate-float-1 items-center gap-2.5 px-3 py-2 rounded-2xl bg-canvas-raised/95 border border-ink-200/80 shadow-md backdrop-blur-md"
      >
        {/* Analog Clock Disc */}
        <div className="relative w-8 h-8 rounded-full bg-canvas border-2 border-signal/40 flex items-center justify-center shadow-inner">
          <div className="w-1 h-1 rounded-full bg-signal absolute z-10" />
          {/* Hour Hand */}
          <div className="w-[1.5px] h-2.5 bg-ink-950 rounded-full absolute bottom-3.5 origin-bottom rotate-45" />
          {/* Minute Hand (Smooth slow rotation) */}
          <div className="w-[1px] h-3 bg-signal rounded-full absolute bottom-3.5 origin-bottom animate-clock-hand" />
        </div>
        <div className="text-left">
          <span className="block text-[10px] uppercase font-bold tracking-wider text-signal leading-none">
            Temps
          </span>
          <span className="text-[11px] font-semibold text-ink-950 font-mono">
            35h cibles / sem.
          </span>
        </div>
      </div>

      {/* =========================================================================
          B. CALENDRIER / AGENDA (PLANNING)
          Position: Haut Droit
          ========================================================================= */}
      <div
        style={{
          transform: `translate3d(${-mouseOffset.x * 0.9}px, ${mouseOffset.y * 0.9}px, 0)`,
        }}
        className="hidden md:flex absolute -top-7 right-4 lg:right-10 animate-float-2 flex-col p-2.5 rounded-2xl bg-canvas-raised/95 border border-ink-200/80 shadow-md backdrop-blur-md w-36"
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-ink-100">
          <span className="text-[10px] font-bold text-signal uppercase tracking-wider">
            Septembre
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-positive" />
        </div>
        <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-medium text-ink-500 font-mono">
          <span>10</span>
          <span className="bg-signal text-white rounded font-bold">11</span>
          <span>12</span>
          <span>13</span>
          <span>14</span>
        </div>
        <span className="text-[9px] text-positive font-semibold mt-1">
          ✓ 0 conflit d&apos;agenda
        </span>
      </div>

      {/* =========================================================================
          C. BILLETS / ENCAISSEMENT (INCOME / MONEY)
          Position: Milieu Gauche
          ========================================================================= */}
      <div
        style={{
          transform: `translate3d(${mouseOffset.x * 1.2}px, ${-mouseOffset.y * 0.7}px, 0)`,
        }}
        className="hidden lg:flex absolute top-1/4 -left-10 xl:-left-16 animate-float-3 flex-col p-3 rounded-2xl bg-canvas-raised/95 border border-ink-200/80 shadow-lg backdrop-blur-md w-44"
      >
        <div className="flex items-center justify-between">
          <div className="w-6 h-6 rounded-lg bg-gold-soft flex items-center justify-center text-gold-dark">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-positive-soft text-positive">
            +18% ce mois
          </span>
        </div>
        <div className="mt-1">
          <span className="text-[10px] text-ink-500 font-medium block">
            Revenus perçus
          </span>
          <span className="text-base font-extrabold text-positive font-mono">
            4 150.00 €
          </span>
        </div>
      </div>

      {/* =========================================================================
          D. CARTE DE VISITE / CLIENT (PEOPLE / CLIENTS)
          Position: Milieu Droit
          ========================================================================= */}
      <div
        style={{
          transform: `translate3d(${-mouseOffset.x * 1.1}px, ${-mouseOffset.y * 1.1}px, 0)`,
        }}
        className="hidden lg:flex absolute top-1/3 -right-8 xl:-right-14 animate-float-4 items-center gap-2.5 p-2.5 rounded-2xl bg-canvas-raised/95 border border-ink-200/80 shadow-lg backdrop-blur-md w-48"
      >
        <div className="w-8 h-8 rounded-full bg-signal text-white text-xs font-bold flex items-center justify-center shrink-0">
          FA
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-ink-950 truncate">
              FinTech Alpha
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-signal shrink-0" />
          </div>
          <span className="text-[10px] text-ink-500 block truncate">
            Consulting • 650 €/j
          </span>
        </div>
      </div>

      {/* =========================================================================
          E. CHECKLIST DES TÂCHES (TASKS)
          Position: Bas Gauche
          ========================================================================= */}
      <div
        style={{
          transform: `translate3d(${mouseOffset.x * 0.9}px, ${mouseOffset.y * 1.2}px, 0)`,
        }}
        className="hidden md:flex absolute -bottom-6 left-6 lg:left-14 animate-float-2 flex-col p-3 rounded-2xl bg-canvas-raised/95 border border-ink-200/80 shadow-md backdrop-blur-md w-44"
      >
        <div className="text-[10px] font-bold text-ink-950 uppercase tracking-wider flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="w-3 h-3 text-signal" />
            Tâches du jour
          </span>
          <span className="text-signal font-mono text-[9px]">3/4</span>
        </div>
        <div className="space-y-1 text-[10px] text-ink-700">
          <div className="flex items-center gap-1.5 text-positive font-medium">
            <Check className="w-3 h-3 text-positive" strokeWidth={3} />
            <span className="line-through text-ink-400 truncate">Audit Cloud Alpha</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5 text-warning fill-warning/30" />
            <span className="truncate">Préparer examen M2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5 text-ink-300" />
            <span className="truncate">Envoyer facture #104</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          F. SMART NOTIFICATION / REMINDER (NOTIFICATIONS)
          Position: Près du bas droit
          ========================================================================= */}
      <div
        style={{
          transform: `translate3d(${-mouseOffset.x * 0.8}px, ${mouseOffset.y * 0.8}px, 0)`,
        }}
        className="hidden md:flex absolute -bottom-8 right-6 lg:right-16 animate-float-1 items-start gap-2.5 p-3 rounded-2xl bg-canvas-raised/95 border border-warning/40 shadow-lg backdrop-blur-md w-52"
      >
        <div className="w-7 h-7 rounded-lg bg-warning-soft flex items-center justify-center text-warning shrink-0 mt-0.5">
          <Bell className="w-4 h-4" />
        </div>
        <div className="text-left min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-ink-950">Rappel Smart</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-warning-soft text-warning">
              J-1
            </span>
          </div>
          <p className="text-[10px] text-ink-600 mt-0.5 leading-snug">
            Facture de <strong>1 250 €</strong> attendue demain
          </p>
        </div>
      </div>
    </div>
  );
}
