"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number; // 0 = ne disparaît pas automatiquement
  title?: string;
  action?: ToastAction;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  action?: ToastAction;
}

interface ToastContextValue {
  /** Affiche un toast ou une notification dans la barre de notifications in-app */
  push: (
    message: string,
    variantOrOptions?: ToastVariant | ToastOptions,
    durationMs?: number
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "border-positive/40 bg-positive-soft/90 text-positive dark:bg-emerald-950/90 dark:border-emerald-700/60 dark:text-emerald-300",
  error: "border-danger/40 bg-danger-soft/90 text-danger dark:bg-rose-950/90 dark:border-rose-700/60 dark:text-rose-300",
  info: "border-signal/40 bg-signal-soft/90 text-signal dark:bg-sky-950/90 dark:border-sky-700/60 dark:text-sky-300",
};

const DEFAULT_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (
      message: string,
      variantOrOptions?: ToastVariant | ToastOptions,
      legacyDurationMs?: number
    ) => {
      const id = `toast-${nextId.current++}`;

      let variant: ToastVariant = "info";
      let durationMs: number = DEFAULT_DURATION_MS;
      let title: string | undefined;
      let action: ToastAction | undefined;

      if (typeof variantOrOptions === "object" && variantOrOptions !== null) {
        variant = variantOrOptions.variant || "info";
        durationMs = variantOrOptions.durationMs !== undefined ? variantOrOptions.durationMs : DEFAULT_DURATION_MS;
        title = variantOrOptions.title;
        action = variantOrOptions.action;
      } else {
        if (typeof variantOrOptions === "string") {
          variant = variantOrOptions;
        }
        if (legacyDurationMs !== undefined) {
          durationMs = legacyDurationMs;
        }
      }

      setToasts((current) => [...current, { id, message, variant, title, action }]);

      // Si durationMs > 0, disparaît après le délai.
      // Si durationMs === 0, NE DISPARAÎT PAS AUTOMATIQUEMENT (reste affiché jusqu'à action ou fermeture).
      if (durationMs > 0) {
        window.setTimeout(() => remove(id), durationMs);
      }
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
              className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[70] flex flex-col gap-2.5 sm:max-w-md pointer-events-none"
              role="region"
              aria-label="Notifications"
            >
              {toasts.map((t) => (
                <div
                  key={t.id}
                  role="status"
                  className={`pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ring-1 ring-black/5 dark:ring-white/10 ${VARIANT_CLASSES[t.variant]}`}
                >
                  <div className="flex-1 min-w-0 pr-1">
                    {t.title && (
                      <h5 className="font-bold text-xs uppercase tracking-wider mb-1 opacity-90 truncate">
                        {t.title}
                      </h5>
                    )}
                    <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">{t.message}</p>
                    {t.action && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await t.action?.onClick();
                            } finally {
                              remove(t.id);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/95 dark:bg-ink-900 text-ink-950 dark:text-white border border-black/10 dark:border-white/15 shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer tap-active flex items-center gap-1.5"
                        >
                          ✓ {t.action.label}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    aria-label="Fermer la notification"
                    className="shrink-0 opacity-70 hover:opacity-100 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
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
