"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";

interface ContactFormProps {
  organizations: { id: string; name: string }[];
  action: (formData: FormData) => Promise<void>;
  initial?: {
    name: string;
    organizationId: string;
    phone: string;
    email: string;
    notes: string;
  };
  submitLabel?: string;
}

export function ContactForm({
  organizations,
  action,
  initial,
  submitLabel = "Créer le contact",
}: ContactFormProps) {
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
      <Field label="Nom du contact" htmlFor="name">
        <TextInput id="name" name="name" defaultValue={initial?.name} required />
      </Field>

      <Field label="Organisation (optionnel)" htmlFor="organizationId">
        <select
          id="organizationId"
          name="organizationId"
          defaultValue={initial?.organizationId ?? ""}
          className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
        >
          <option value="">Aucune — contact indépendant</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Téléphone (optionnel)" htmlFor="phone">
          <TextInput id="phone" name="phone" type="tel" defaultValue={initial?.phone} />
        </Field>
        <Field label="Email (optionnel)" htmlFor="email">
          <TextInput id="email" name="email" type="email" defaultValue={initial?.email} />
        </Field>
      </div>

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
