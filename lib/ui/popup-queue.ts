"use client";

import { useEffect, useState } from "react";

/**
 * File d'attente des fenêtres d'accueil : UNE seule fenêtre à la fois à l'écran.
 * Les autres attendent qu'elle se ferme, puis s'affichent dans l'ordre de priorité
 * (plus le nombre est petit, plus la fenêtre passe tôt).
 *
 *   0 visite guidée · 1 accueil du jour · 2 invitation aux rappels vocaux · 3 installation de l'app · 4 conseil du robot
 */
export const POPUP_PRIORITY = {
  tour: 0,
  welcome: 1,
  voicePush: 2,
  install: 3,
  tip: 4,
} as const;

type PopupId = keyof typeof POPUP_PRIORITY;

let current: PopupId | null = null;
const waiting = new Map<PopupId, () => void>();
const EVENT = "remindme:popup-slot";

function grantNext() {
  if (current || waiting.size === 0) return;
  const next = [...waiting.keys()].sort((a, b) => POPUP_PRIORITY[a] - POPUP_PRIORITY[b])[0]!;
  const grant = waiting.get(next)!;
  waiting.delete(next);
  current = next;
  grant();
}

function request(id: PopupId, onGrant: () => void) {
  if (current === id) return onGrant();
  waiting.set(id, onGrant);
  // Laisse aux fenêtres plus prioritaires montées en même temps le temps de se déclarer
  setTimeout(grantNext, 120);
}

function release(id: PopupId) {
  waiting.delete(id);
  if (current === id) {
    current = null;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
    setTimeout(grantNext, 600); // courte respiration entre deux fenêtres
  }
}

/**
 * Réserve l'écran pour une fenêtre. `wanted` = la fenêtre voudrait s'afficher.
 * Renvoie true quand c'est son tour. Le créneau est libéré dès que `wanted` repasse à false.
 */
export function usePopupSlot(id: PopupId, wanted: boolean): boolean {
  const [granted, setGranted] = useState(false);
  useEffect(() => {
    if (!wanted) {
      release(id);
      setGranted(false);
      return;
    }
    let alive = true;
    request(id, () => alive && setGranted(true));
    return () => {
      alive = false;
      release(id);
    };
  }, [id, wanted]);
  return wanted && granted;
}
