"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton, TextInput } from "@/components/ui/field";
import type { CalendarEventStatus } from "@/types/database";

interface EventActionsProps {
  status: CalendarEventStatus;
  isPastDue: boolean;
  defaultRescheduleValue: string;
  onSetStatus: (status: CalendarEventStatus) => Promise<void>;
  onReschedule: (formData: FormData) => Promise<void>;
}

export function EventActions({
  status,
  isPastDue,
  defaultRescheduleValue,
  onSetStatus,
  onReschedule,
}: EventActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReschedule, setShowReschedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSetStatus(next: CalendarEventStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await onSetStatus(next);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      }
    });
  }

  async function handleRescheduleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      await onReschedule(formData);
      setShowReschedule(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "completed" ? (
        <div className="rounded-lg border border-positive/30 bg-positive/10 px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-2 text-positive font-semibold text-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-positive" />
            <span>Cette séance est validée comme terminée.</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 border-t border-positive/20">
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("planned")}
              className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-canvas disabled:opacity-60 cursor-pointer"
            >
              Rétablir comme prévue
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowReschedule((v) => !v)}
              className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-canvas cursor-pointer"
            >
              Reporter à une autre date
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("cancelled")}
              className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-500 hover:border-danger hover:text-danger disabled:opacity-60 cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : isPastDue && status === "planned" ? (
        <div className="rounded-lg border border-warning bg-warning-soft px-4 py-3">
          <p className="mb-3 font-medium text-ink-950">Avez-vous terminé cette activité ?</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("completed")}
              className="rounded-md bg-positive px-3 py-1.5 text-sm font-medium text-white hover:bg-positive/90 disabled:opacity-60 cursor-pointer"
            >
              Oui, terminé
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("missed")}
              className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-60 cursor-pointer"
            >
              Non, manqué
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowReschedule((v) => !v)}
              className="rounded-md border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-signal-soft cursor-pointer"
            >
              Reporter
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status !== "in_progress" && status !== "cancelled" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("in_progress")}
              className="rounded-md border border-signal px-3 py-1.5 text-sm font-medium text-signal hover:bg-signal-soft disabled:opacity-60 cursor-pointer"
            >
              Marquer en cours
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSetStatus("completed")}
            className="rounded-md border border-positive px-3 py-1.5 text-sm font-medium text-positive hover:bg-positive-soft disabled:opacity-60 cursor-pointer"
          >
            Marquer terminé
          </button>
          {status !== "cancelled" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowReschedule((v) => !v)}
              className="rounded-md border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-signal-soft cursor-pointer"
            >
              Reporter
            </button>
          ) : null}
          {status !== "cancelled" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("cancelled")}
              className="rounded-md border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-500 hover:border-danger hover:text-danger disabled:opacity-60 cursor-pointer"
            >
              Annuler
            </button>
          ) : null}
        </div>
      )}

      {showReschedule ? (
        <form onSubmit={handleRescheduleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-100 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newStartsAt" className="text-sm font-medium text-ink-700">
              Nouvelle date et heure
            </label>
            <TextInput
              id="newStartsAt"
              name="newStartsAt"
              type="datetime-local"
              defaultValue={defaultRescheduleValue}
              required
            />
          </div>
          <PrimaryButton type="submit" className="w-auto">
            Confirmer le report
          </PrimaryButton>
        </form>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
