"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";

interface OrganizationFormProps {
  action: (formData: FormData) => Promise<void>;
  initial?: {
    name: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
  };
  submitLabel?: string;
}

export function OrganizationForm({ action, initial, submitLabel = "Créer l'organisation" }: OrganizationFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
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

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <Field label="Nom de l'organisation" htmlFor="name">
        <TextInput id="name" name="name" defaultValue={initial?.name} placeholder="Ex : Newmoney Holding" required />
      </Field>

      <Field label="Nom du contact principal (optionnel)" htmlFor="contactName">
        <TextInput id="contactName" name="contactName" defaultValue={initial?.contactName} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Téléphone (optionnel)" htmlFor="phone">
          <TextInput id="phone" name="phone" type="tel" defaultValue={initial?.phone} />
        </Field>
        <Field label="Email (optionnel)" htmlFor="email">
          <TextInput id="email" name="email" type="email" defaultValue={initial?.email} />
        </Field>
      </div>

      <Field label="Adresse (optionnel)" htmlFor="address">
        <textarea
          id="address"
          name="address"
          defaultValue={initial?.address}
          rows={2}
          className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2 text-ink-950"
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
          disabled={submitting}
          className="rounded-md border border-ink-300 px-4 py-2.5 font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <PrimaryButton type="submit" loading={submitting} disabled={submitting} className="w-auto px-6">
          {submitting ? "Enregistrement..." : submitLabel}
        </PrimaryButton>
      </div>
    </form>
  );
}
