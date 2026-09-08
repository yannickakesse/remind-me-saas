"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { TASK_PRIORITIES } from "@/lib/validation/tasks";

interface TaskFormProps {
  activities: { id: string; name: string; color: string | null }[];
  action: (formData: FormData) => Promise<void>;
  initial?: {
    title: string;
    description: string;
    activityId: string;
    priority: string;
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      await action(formData);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <Field label="Titre" htmlFor="title">
        <TextInput id="title" name="title" defaultValue={initial?.title} required />
      </Field>

      <Field label="Description (optionnel)" htmlFor="description">
        <textarea
          id="description"
          name="description"
          defaultValue={initial?.description}
          rows={3}
          className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
        />
      </Field>

      <Field label="Activité liée (optionnel)" htmlFor="activityId">
        <select
          id="activityId"
          name="activityId"
          defaultValue={initial?.activityId ?? ""}
          className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
        >
          <option value="">Aucune — tâche libre</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Priorité" htmlFor="priority">
          <select
            id="priority"
            name="priority"
            defaultValue={initial?.priority ?? "medium"}
            className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rappel avant échéance (minutes, optionnel)" htmlFor="reminderMinutesBefore">
          <TextInput
            id="reminderMinutesBefore"
            name="reminderMinutesBefore"
            type="number"
            min="0"
            step="5"
            defaultValue={initial?.reminderMinutesBefore}
            placeholder="Ex : 60"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date d'échéance (optionnel)" htmlFor="dueDate">
          <TextInput id="dueDate" name="dueDate" type="date" defaultValue={initial?.dueDate} />
        </Field>
        <Field label="Heure d'échéance (optionnel)" htmlFor="dueTime">
          <TextInput id="dueTime" name="dueTime" type="time" defaultValue={initial?.dueTime} />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-ink-300 px-4 py-2.5 font-medium text-ink-700"
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
