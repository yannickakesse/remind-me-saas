"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  /** Affiche un toast qui disparaît automatiquement (§60 du prompt maître). */
  push: (message: string, variant?: ToastVariant, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "border-positive/30 bg-positive-soft text-positive",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-signal/30 bg-signal-soft text-signal",
};

const DEFAULT_DURATION_MS = 4000;

/**
 * Fournit `useToast()` à toute l'application (wrapper posé une fois dans
 * app/layout.tsx). Remplace les messages d'erreur/succès inline dupliqués
 * page par page — toujours un message compréhensible, jamais une erreur
 * technique brute (§60 : ne jamais afficher "PostgrestError...").
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant = "info", durationMs: number = DEFAULT_DURATION_MS) => {
      const id = `toast-${nextId.current++}`;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => remove(id), durationMs);
    },
    [remove]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
              role="region"
              aria-label="Notifications"
            >
              {toasts.map((t) => (
                <div
                  key={t.id}
                  role="status"
                  className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-md ${VARIANT_CLASSES[t.variant]}`}
                >
                  <span>{t.message}</span>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    aria-label="Fermer la notification"
                    className="shrink-0 opacity-70 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé à l'intérieur de <ToastProvider>.");
  return ctx;
}
