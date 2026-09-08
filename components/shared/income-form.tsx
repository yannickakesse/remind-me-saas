"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { PAYMENT_METHODS } from "@/lib/validation/finances";

interface IncomeFormProps {
  activities: { id: string; name: string; color: string | null }[];
  currencies: { code: string; symbol: string }[];
  action: (formData: FormData) => Promise<void>;
  initial?: {
    activityId?: string;
    label?: string;
    incomeType?: string;
    amount?: string;
    currency?: string;
    paymentMethod?: string;
    reference?: string;
    dueDate?: string;
    notes?: string;
  };
  submitLabel?: string;
}

export function IncomeForm({
  activities,
  currencies,
  action,
  initial,
  submitLabel = "Enregistrer le revenu",
}: IncomeFormProps) {
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
      <Field label="Libellé du revenu" htmlFor="label">
        <TextInput
          id="label"
          name="label"
          defaultValue={initial?.label}
          placeholder="Ex : Facture client Acme Corp, Salaire mensuel, Mission freelance..."
          required
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Type de revenu" htmlFor="incomeType">
          <select
            id="incomeType"
            name="incomeType"
            defaultValue={initial?.incomeType ?? "contract"}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            <option value="contract">Prestation / Contrat client</option>
            <option value="salary">Salaire / Traitement fixe</option>
            <option value="freelance">Mission freelance / TJM</option>
            <option value="sales">Ventes de produits / Boutique</option>
            <option value="coaching">Coaching / Formation</option>
            <option value="dividend">Dividendes / Placements</option>
            <option value="other">Autre source</option>
          </select>
        </Field>

        <Field label="Activité liée (recommandé)" htmlFor="activityId">
          <select
            id="activityId"
            name="activityId"
            defaultValue={initial?.activityId ?? ""}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            <option value="">Aucune — revenu libre</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Field label="Montant" htmlFor="amount">
            <TextInput
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={initial?.amount}
              placeholder="0.00"
              required
            />
          </Field>
        </div>
        <div>
          <Field label="Devise" htmlFor="currency">
            <select
              id="currency"
              name="currency"
              defaultValue={initial?.currency ?? currencies[0]?.code ?? "XOF"}
              className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Moyen de paiement attendu" htmlFor="paymentMethod">
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={initial?.paymentMethod ?? "bank_transfer"}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Référence de facture (optionnel)" htmlFor="reference">
          <TextInput
            id="reference"
            name="reference"
            defaultValue={initial?.reference}
            placeholder="Ex : FAC-2026-0042"
          />
        </Field>
      </div>

      <Field label="Date attendue ou date d'encaissement" htmlFor="dueDate">
        <TextInput id="dueDate" name="dueDate" type="date" defaultValue={initial?.dueDate} />
      </Field>

      <Field label="Notes (optionnel)" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes}
          rows={2}
          placeholder="Modalités de paiement, conditions, échéancier..."
          className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
        />
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
