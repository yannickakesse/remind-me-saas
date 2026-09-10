"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-ink-200 bg-canvas-raised p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger text-2xl">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-ink-950">Une erreur est survenue</h2>
          <p className="text-sm text-ink-500">
            Nous n'avons pas pu charger cette page correctement. Vos données sont en sécurité.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className={buttonClasses("primary", "sm")}
          >
            Réessayer
          </button>
          <Link href="/dashboard" className={buttonClasses("secondary", "sm")}>
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
