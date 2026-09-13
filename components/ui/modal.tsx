"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Largeur maximale (classe Tailwind). Défaut : max-w-md. */
  maxWidthClassName?: string;
}

/**
 * Modale générique (§87 du prompt maître) : centrée, scrollable sur mobile,
 * ferme avec Escape, gère le focus (premier élément focusable au montage,
 * restauration au démontage), bouton de fermeture toujours présent.
 * Utilisée telle quelle par ConfirmDialog ; réutilisable directement pour
 * tout futur formulaire en modale.
 */
export function Modal({ open, onClose, title, description, children, maxWidthClassName = "max-w-md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-ink-950/40 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${maxWidthClassName} rounded-2xl border border-ink-200 bg-canvas-raised p-6 shadow-xl`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-ink-950">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-lg p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
