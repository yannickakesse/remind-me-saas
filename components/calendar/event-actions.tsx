"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Calendar, ArrowRight, RotateCcw, Clock } from "lucide-react";
import { PrimaryButton, TextInput } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
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
  const [showEditOptions, setShowEditOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSetStatus(next: CalendarEventStatus) {
    setError(null);
    window.dispatchEvent(new CustomEvent("remindme:loading-start"));
    startTransition(async () => {
      try {
        await onSetStatus(next);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      } finally {
        window.dispatchEvent(new CustomEvent("remindme:loading-stop"));
      }
    });
  }

  async function handleRescheduleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    window.dispatchEvent(new CustomEvent("remindme:loading-start"));
    const formData = new FormData(e.currentTarget);
    try {
      await onReschedule(formData);
      setShowReschedule(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      window.dispatchEvent(new CustomEvent("remindme:loading-stop"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. État : TERMINÉ (Validé avec succès) */}
      {status === "completed" ? (
        <div className="rounded-2xl border border-positive/30 bg-positive/10 dark:bg-positive/15 p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-positive text-white shrink-0 shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-positive-dark dark:text-positive text-sm sm:text-base">
                Cette séance est validée comme terminée.
              </h3>
              <p className="text-xs text-ink-600 dark:text-ink-400">
                Vos heures et vos statistiques de rentabilité sont à jour.
              </p>
            </div>
          </div>

          {/* Bouton principal clair pour continuer vers le tableau de bord */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-positive hover:bg-positive-dark text-white font-bold text-xs sm:text-sm shadow-md shadow-positive/20 active:scale-98 transition-all"
            >
              <span>Continuer au tableau de bord</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => setShowEditOptions((v) => !v)}
              className="text-xs font-semibold text-ink-500 hover:text-ink-950 underline-offset-4 hover:underline py-1.5 px-2 transition-colors cursor-pointer text-center"
            >
              {showEditOptions ? "Masquer les options de modification" : "Modifier cette séance…"}
            </button>
          </div>

          {/* Options de modification repliées par défaut */}
          {showEditOptions && (
            <div className="pt-3 border-t border-positive/20 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSetStatus("planned")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-800 dark:text-ink-200 hover:bg-canvas-subtle disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reprogrammer à la même date</span>
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setShowReschedule((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-800 dark:text-ink-200 hover:bg-canvas-subtle cursor-pointer"
              >
                <Calendar className="h-3 w-3" />
                <span>Reporter à une autre date</span>
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSetStatus("cancelled")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-danger/40 bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white disabled:opacity-50 cursor-pointer transition-colors"
              >
                <span>Annuler la séance</span>
              </button>
            </div>
          )}
        </div>
      ) : status === "missed" ? (
        /* 2. État : MANQUÉ */
        <div className="rounded-2xl border border-danger/30 bg-danger/10 dark:bg-danger/15 p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger text-white shrink-0 shadow-sm">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-danger text-sm sm:text-base">
                Cette séance a été marquée comme manquée.
              </h3>
              <p className="text-xs text-ink-600 dark:text-ink-400">
                Que souhaitez-vous faire pour rattraper ou organiser cette activité ?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("planned")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-signal hover:bg-signal-dark text-white px-4 py-2 text-xs font-bold shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer transition-all"
            >
              {pending ? <Spinner size={13} /> : <RotateCcw className="h-3.5 w-3.5" />}
              <span>Reprogrammer à la même date</span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowReschedule((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas px-4 py-2 text-xs font-bold text-ink-950 dark:text-white hover:bg-canvas-subtle cursor-pointer active:scale-98 transition-all"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Reporter à une autre date</span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("cancelled")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-canvas-raised px-3.5 py-2 text-xs font-semibold text-ink-600 dark:text-ink-400 hover:border-danger hover:text-danger disabled:opacity-50 cursor-pointer transition-all"
            >
              <span>Annuler</span>
            </button>
          </div>
        </div>
      ) : isPastDue && status === "planned" ? (
        /* 3. État : ÉCHÉANCE PASSÉE (Confirmation requise) */
        <div className="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-ink-950 dark:text-white font-bold text-sm sm:text-base">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Avez-vous terminé cette activité ?</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("completed")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-sm active:scale-98 disabled:opacity-60 cursor-pointer transition-all"
            >
              {pending ? <Spinner size={14} /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Oui, terminé</span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("missed")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-sm active:scale-98 disabled:opacity-60 cursor-pointer transition-all"
            >
              {pending ? <Spinner size={14} /> : <AlertCircle className="h-4 w-4" />}
              <span>Non, manqué</span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowReschedule((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink-800 dark:text-ink-200 hover:bg-canvas-subtle cursor-pointer active:scale-98 transition-all"
            >
              <Calendar className="h-4 w-4" />
              <span>Reporter</span>
            </button>
          </div>
        </div>
      ) : (
        /* 4. État : PRÉVU (Standard) */
        <div className="flex flex-wrap gap-2.5">
          {status !== "in_progress" && status !== "cancelled" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("in_progress")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-signal bg-signal-soft/40 px-4 py-2 text-xs sm:text-sm font-bold text-signal hover:bg-signal hover:text-white disabled:opacity-60 cursor-pointer transition-all"
            >
              <span>Marquer en cours</span>
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSetStatus("completed")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-positive hover:bg-positive-dark text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-sm active:scale-98 disabled:opacity-60 cursor-pointer transition-all"
          >
            {pending ? <Spinner size={14} /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Marquer terminé</span>
          </button>
          {status !== "cancelled" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowReschedule((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink-800 dark:text-ink-200 hover:bg-canvas-subtle cursor-pointer transition-all"
            >
              <Calendar className="h-4 w-4" />
              <span>Reporter</span>
            </button>
          ) : null}
          {status !== "cancelled" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSetStatus("cancelled")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-canvas-raised px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink-500 hover:border-danger hover:text-danger disabled:opacity-60 cursor-pointer transition-all"
            >
              <span>Annuler</span>
            </button>
          ) : null}
        </div>
      )}

      {/* Formulaire de report de date */}
      {showReschedule ? (
        <form
          onSubmit={handleRescheduleSubmit}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink-200 dark:border-ink-800 bg-canvas p-4 sm:p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
            <label htmlFor="newStartsAt" className="text-xs font-bold text-ink-950 dark:text-white">
              Nouvelle date et heure de début
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

      {error ? (
        <div role="alert" className="rounded-xl bg-danger-soft p-3 text-xs text-danger font-medium">
          {error}
        </div>
      ) : null}
    </div>
  );
}
