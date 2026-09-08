"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { EXPENSE_CATEGORIES } from "@/lib/validation/finances";

interface ExpenseFormProps {
  activities: { id: string; name: string; color: string | null }[];
  currencies: { code: string; symbol: string }[];
  action: (formData: FormData) => Promise<void>;
  initial?: {
    activityId: string;
    label: string;
    category: string;
    amount: string;
    currency: string;
    dueDate: string;
    notes: string;
  };
  submitLabel?: string;
}

export function ExpenseForm({
  activities,
  currencies,
  action,
  initial,
  submitLabel = "Ajouter la dépense",
}: ExpenseFormProps) {
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
      <Field label="Libellé" htmlFor="label">
        <TextInput
          id="label"
          name="label"
          defaultValue={initial?.label}
          placeholder="Ex : Abonnement logiciel"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Activité liée (optionnel)" htmlFor="activityId">
          <select
            id="activityId"
            name="activityId"
            defaultValue={initial?.activityId ?? ""}
            className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
          >
            <option value="">Aucune — dépense générale</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Catégorie (optionnel)" htmlFor="category">
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? ""}
            className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
          >
            <option value="">—</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Montant" htmlFor="amount">
          <TextInput
            id="amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initial?.amount}
            required
          />
        </Field>
        <Field label="Devise" htmlFor="currency">
          <select
            id="currency"
            name="currency"
            defaultValue={initial?.currency ?? currencies[0]?.code}
            className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Date d'échéance" htmlFor="dueDate">
        <TextInput id="dueDate" name="dueDate" type="date" defaultValue={initial?.dueDate} required />
      </Field>

      <Field label="Notes (optionnel)" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes}
          rows={3}
          className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
        />
      </Field>

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
