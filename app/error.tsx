"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, LayoutDashboard } from "lucide-react";

const RETRY_KEY = "remindme_error_auto_retry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  // Une erreur passagère (retour après impression, réseau, cache) se règle le plus
  // souvent en rechargeant les données : on tente une fois en silence avant d'afficher l'écran.
  const [recovering, setRecovering] = useState(true);

  useEffect(() => {
    console.error("Application Error:", error);

    let alreadyRetried = false;
    try {
      alreadyRetried = sessionStorage.getItem(RETRY_KEY) === window.location.pathname;
      sessionStorage.setItem(RETRY_KEY, window.location.pathname);
    } catch {}

    if (alreadyRetried) {
      setRecovering(false);
      return;
    }

    router.refresh();
    const timer = setTimeout(() => {
      reset();
      // Si l'erreur persiste, l'écran ci-dessous s'affiche au prochain rendu
      setRecovering(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [error, reset, router]);

  const retry = () => {
    try {
      sessionStorage.removeItem(RETRY_KEY);
    } catch {}
    router.refresh();
    reset();
  };

  if (recovering) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <RefreshCw className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md p-7 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal/10 text-signal">
          <RefreshCw className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-ink-950 dark:text-white">
          Un instant, la page se recharge mal
        </h2>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">
          Vos données sont en sécurité. Rechargez la page ou revenez au tableau de bord.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-signal-dark transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Recharger
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 dark:border-ink-800 px-4 py-2.5 text-sm font-semibold text-ink-700 dark:text-ink-200 hover:bg-ink-100/70 dark:hover:bg-white/5 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" /> Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
