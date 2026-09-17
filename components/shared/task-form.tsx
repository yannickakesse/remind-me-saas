"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/validation/tasks";

interface TaskFormProps {
  activities: { id: string; name: string; color: string | null }[];
  action: (formData: FormData) => Promise<void>;
  initial?: {
    title: string;
    description: string;
    activityId: string;
    priority: string;
    status?: string;
    dueDate: string;
    dueTime: string;
    reminderMinutesBefore: string;
  };
  submitLabel?: string;
}

export function TaskForm({
  activities,
  action,
  initial,
  submitLabel = "Créer la tâche",
}: TaskFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dueDate, setDueDate] = useState<string>(initial?.dueDate ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      await action(formData);
    } catch (err: any) {
      if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
        return;
      }
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  // Raccourcis de date
  function setDateShortcut(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDueDate(d.toISOString().slice(0, 10));
  }

  function setEndOfWeek() {
    const d = new Date();
    const day = d.getDay();
    const diff = (5 - day + 7) % 7; // Vendredi
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    setDueDate(d.toISOString().slice(0, 10));
  }

  function setNextMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = (1 - day + 7) % 7; // Lundi prochain
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    setDueDate(d.toISOString().slice(0, 10));
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <Field label="Titre de la tâche" htmlFor="title">
        <TextInput
          id="title"
          name="title"
          defaultValue={initial?.title}
          placeholder="Ex : Préparer la facture mensuelle, livrable client..."
          required
        />
      </Field>

      <Field label="Description (optionnel)" htmlFor="description">
        <textarea
          id="description"
          name="description"
          defaultValue={initial?.description}
          rows={3}
          placeholder="Détails, liens ou consignes relatives à cette tâche..."
          className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Activité liée (optionnel)" htmlFor="activityId">
          <select
            id="activityId"
            name="activityId"
            defaultValue={initial?.activityId ?? ""}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            <option value="">Aucune — tâche libre</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Priorité" htmlFor="priority">
          <select
            id="priority"
            name="priority"
            defaultValue={initial?.priority ?? "medium"}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Statut si en mode édition */}
      {initial?.status ? (
        <Field label="Statut" htmlFor="status">
          <select
            id="status"
            name="status"
            defaultValue={initial.status}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {/* Date d'échéance et raccourcis */}
      <div className="rounded-xl border border-ink-200 bg-canvas/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="dueDate" className="text-sm font-medium text-ink-900">
            Date d'échéance (optionnel)
          </label>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDateShortcut(0)}
              className="rounded bg-ink-100 px-2 py-0.5 text-ink-700 hover:bg-ink-200"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setDateShortcut(1)}
              className="rounded bg-ink-100 px-2 py-0.5 text-ink-700 hover:bg-ink-200"
            >
              Demain
            </button>
            <button
              type="button"
              onClick={setEndOfWeek}
              className="rounded bg-ink-100 px-2 py-0.5 text-ink-700 hover:bg-ink-200"
            >
              Vendredi
            </button>
            <button
              type="button"
              onClick={setNextMonday}
              className="rounded bg-ink-100 px-2 py-0.5 text-ink-700 hover:bg-ink-200"
            >
              Lundi proch.
            </button>
            {dueDate ? (
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="text-danger hover:underline ml-1"
              >
                Effacer
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput
            id="dueDate"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <TextInput
            id="dueTime"
            name="dueTime"
            type="time"
            defaultValue={initial?.dueTime}
            placeholder="Heure (optionnel)"
          />
        </div>
      </div>

      <Field label="Rappel avant échéance" htmlFor="reminderMinutesBefore">
        <select
          id="reminderMinutesBefore"
          name="reminderMinutesBefore"
          defaultValue={initial?.reminderMinutesBefore ?? ""}
          className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
        >
          <option value="">Aucun rappel</option>
          <option value="15">15 minutes avant</option>
          <option value="30">30 minutes avant</option>
          <option value="60">1 heure avant</option>
          <option value="120">2 heures avant</option>
          <option value="1440">1 jour avant</option>
          <option value="2880">2 jours avant</option>
        </select>
      </Field>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-ink-300 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
        >
          Annuler
        </button>
        <PrimaryButton type="submit" disabled={submitting} className="w-auto px-6">
          {submitting ? "Enregistrement..." : submitLabel}
        </PrimaryButton>
      </div>
    </form>
  );
}
