"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/validation/finances";

interface ExpenseFormProps {
  activities: { id: string; name: string; color: string | null }[];
  currencies: { code: string; symbol: string }[];
  action: (formData: FormData) => Promise<void>;
  initial?: {
    activityId?: string;
    label?: string;
    category?: string;
    amount?: string;
    currency?: string;
    expenseType?: string;
    businessPercentage?: string;
    merchant?: string;
    paymentMethod?: string;
    dueDate?: string;
    notes?: string;
  };
  submitLabel?: string;
}

export function ExpenseForm({
  activities,
  currencies,
  action,
  initial,
  submitLabel = "Enregistrer la dépense",
}: ExpenseFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expenseType, setExpenseType] = useState(initial?.expenseType ?? "personal");
  const [businessPercentage, setBusinessPercentage] = useState(
    initial?.businessPercentage ?? (initial?.expenseType === "business" ? "100" : "50")
  );

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

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <Field label="Libellé de la dépense" htmlFor="label">
        <TextInput
          id="label"
          name="label"
          defaultValue={initial?.label}
          placeholder="Ex : Abonnement Notion, Matériel de bureau, Train..."
          required
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Catégorie" htmlFor="category">
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? EXPENSE_CATEGORIES[0].value}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Activité liée (optionnel)" htmlFor="activityId">
          <select
            id="activityId"
            name="activityId"
            defaultValue={initial?.activityId ?? ""}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            <option value="">Aucune — dépense générale</option>
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

      {/* Qualification Pro / Perso / Mixte (§48) */}
      <div className="rounded-xl border border-ink-200 bg-canvas/40 p-4 space-y-3">
        <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide">
          Affectation de la dépense
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "personal", label: "Personnelle (100% perso)" },
            { value: "business", label: "Professionnelle (100% pro)" },
            { value: "mixed", label: "Mixte (ratio pro/perso)" },
          ].map((t) => (
            <label
              key={t.value}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-colors ${
                expenseType === t.value
                  ? "border-signal bg-signal-soft text-signal font-semibold"
                  : "border-ink-200 bg-canvas-raised text-ink-700 hover:bg-ink-50"
              }`}
            >
              <input
                type="radio"
                name="expenseType"
                value={t.value}
                checked={expenseType === t.value}
                onChange={() => {
                  setExpenseType(t.value);
                  if (t.value === "business") setBusinessPercentage("100");
                  if (t.value === "personal") setBusinessPercentage("0");
                  if (t.value === "mixed") setBusinessPercentage("50");
                }}
                className="sr-only"
              />
              <span className="text-xs">{t.label}</span>
            </label>
          ))}
        </div>

        {expenseType === "mixed" ? (
          <div className="pt-2">
            <div className="flex justify-between text-xs text-ink-700 mb-1">
              <span>Part professionnelle déductible</span>
              <strong>{businessPercentage}% pro</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              name="businessPercentage"
              value={businessPercentage}
              onChange={(e) => setBusinessPercentage(e.target.value)}
              className="w-full accent-signal"
            />
          </div>
        ) : (
          <input type="hidden" name="businessPercentage" value={expenseType === "business" ? "100" : "0"} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Commerçant / Fournisseur (optionnel)" htmlFor="merchant">
          <TextInput
            id="merchant"
            name="merchant"
            defaultValue={initial?.merchant}
            placeholder="Ex : Amazon, Apple, SNCF, Total..."
          />
        </Field>

        <Field label="Moyen de paiement" htmlFor="paymentMethod">
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={initial?.paymentMethod ?? "card"}
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Date d'échéance ou de paiement" htmlFor="dueDate">
        <TextInput id="dueDate" name="dueDate" type="date" defaultValue={initial?.dueDate} />
      </Field>

      <Field label="Notes & Références (optionnel)" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes}
          rows={2}
          placeholder="Numéro de facture, commentaire de justification..."
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
