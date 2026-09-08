"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import {
  ACTIVITY_TYPES,
  COMPENSATION_FREQUENCIES,
  WEEKDAYS,
} from "@/lib/validation/activities";

interface ScheduleRow {
  weekday: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  recurrence: "weekly" | "biweekly" | "custom";
}

interface ActivityFormProps {
  currencies: { code: string; name: string; symbol: string }[];
  defaultCurrency?: string;
  action: (formData: FormData) => Promise<void>;
  initial?: {
    name: string;
    description: string;
    category: string;
    color: string;
    type: string;
    organizationName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    workMode: string;
    location: string;
    startDate: string;
    endDate: string;
    variableHours: boolean;
    schedules: ScheduleRow[];
    amount: string;
    currency: string;
    frequency: string;
    paymentDay: string;
    paymentTerms: string;
  };
  submitLabel?: string;
}

const COLORS = [
  "#1E3A5F", "#1F7A4D", "#B5751B", "#A32C2C",
  "#6B4C9A", "#2A6F77", "#7A4A2A", "#4A5568",
];

export function ActivityForm({
  currencies,
  defaultCurrency,
  action,
  initial,
  submitLabel = "Créer l'activité",
}: ActivityFormProps) {
  const router = useRouter();

  const [color, setColor] = useState(initial?.color ?? COLORS[0]!);
  const [variableHours, setVariableHours] = useState(
    initial?.variableHours ?? false
  );
  const [schedules, setSchedules] = useState<ScheduleRow[]>(
    initial?.schedules ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addSchedule() {
    setSchedules((rows) => [
      ...rows,
      { weekday: 1, startTime: "09:00", endTime: "17:00", breakMinutes: 0, recurrence: "weekly" },
    ]);
  }

  function updateSchedule(index: number, patch: Partial<ScheduleRow>) {
    setSchedules((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function removeSchedule(index: number) {
    setSchedules((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("color", color);
    formData.set("schedulesJson", JSON.stringify(schedules));

    try {
      await action(formData);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-10">
      {/* ---- Infos générales ---- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Informations générales
        </h2>

        <Field label="Nom de l'activité" htmlFor="name">
          <TextInput id="name" name="name" defaultValue={initial?.name} required />
        </Field>

        <Field label="Description (optionnel)" htmlFor="description">
          <textarea
            id="description"
            name="description"
            defaultValue={initial?.description}
            rows={2}
            className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" htmlFor="type">
            <select
              id="type"
              name="type"
              defaultValue={initial?.type ?? ACTIVITY_TYPES[0].value}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Catégorie (optionnel)" htmlFor="category">
            <TextInput id="category" name="category" defaultValue={initial?.category} />
          </Field>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">
            Couleur
          </label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Couleur ${c}`}
                aria-pressed={color === c}
                className="h-8 w-8 rounded-full ring-offset-2"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---- Organisation ---- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Organisation
        </h2>

        <Field label="Entreprise / client (optionnel)" htmlFor="organizationName">
          <TextInput
            id="organizationName"
            name="organizationName"
            defaultValue={initial?.organizationName}
            placeholder="Ex : Acme SARL"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact principal (optionnel)" htmlFor="contactName">
            <TextInput id="contactName" name="contactName" defaultValue={initial?.contactName} />
          </Field>
          <Field label="Téléphone" htmlFor="contactPhone">
            <TextInput id="contactPhone" name="contactPhone" defaultValue={initial?.contactPhone} />
          </Field>
        </div>

        <Field label="Email du contact" htmlFor="contactEmail">
          <TextInput
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={initial?.contactEmail}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mode de travail" htmlFor="workMode">
            <select
              id="workMode"
              name="workMode"
              defaultValue={initial?.workMode ?? "onsite"}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              <option value="onsite">Présentiel</option>
              <option value="remote">Télétravail</option>
              <option value="hybrid">Hybride</option>
            </select>
          </Field>
          <Field label="Lieu (optionnel)" htmlFor="location">
            <TextInput id="location" name="location" defaultValue={initial?.location} />
          </Field>
        </div>

        <Field label="Adresse (optionnel)" htmlFor="address">
          <TextInput id="address" name="address" defaultValue={initial?.address} />
        </Field>
      </section>

      {/* ---- Horaires ---- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Horaires
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date de début (optionnel)" htmlFor="startDate">
            <TextInput id="startDate" name="startDate" type="date" defaultValue={initial?.startDate} />
          </Field>
          <Field label="Date de fin (optionnel)" htmlFor="endDate">
            <TextInput id="endDate" name="endDate" type="date" defaultValue={initial?.endDate} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="variableHours"
            checked={variableHours}
            onChange={(e) => setVariableHours(e.target.checked)}
          />
          Mes horaires varient d'une semaine à l'autre
        </label>

        <div className="flex flex-col gap-3">
          {schedules.map((row, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-3 rounded-md border border-ink-100 p-3"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-500">Jour</label>
                <select
                  value={row.weekday}
                  onChange={(e) => updateSchedule(i, { weekday: Number(e.target.value) })}
                  className="rounded-md border border-ink-300 px-2 py-1.5 text-sm"
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-500">Début</label>
                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => updateSchedule(i, { startTime: e.target.value })}
                  className="rounded-md border border-ink-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-500">Fin</label>
                <input
                  type="time"
                  value={row.endTime}
                  onChange={(e) => updateSchedule(i, { endTime: e.target.value })}
                  className="rounded-md border border-ink-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-500">Pause (min)</label>
                <input
                  type="number"
                  min={0}
                  value={row.breakMinutes}
                  onChange={(e) => updateSchedule(i, { breakMinutes: Number(e.target.value) })}
                  className="w-20 rounded-md border border-ink-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSchedule(i)}
                className="ml-auto text-sm text-danger hover:underline"
              >
                Retirer
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addSchedule}
            className="self-start rounded-md border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
          >
            + Ajouter un créneau
          </button>
        </div>
      </section>

      {/* ---- Rémunération ---- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Rémunération
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Montant" htmlFor="amount">
            <TextInput
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.amount}
              required
            />
          </Field>
          <Field label="Devise" htmlFor="currency">
            <select
              id="currency"
              name="currency"
              defaultValue={initial?.currency ?? defaultCurrency}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fréquence" htmlFor="frequency">
            <select
              id="frequency"
              name="frequency"
              defaultValue={initial?.frequency ?? "monthly"}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              {COMPENSATION_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jour de paiement (optionnel)" htmlFor="paymentDay">
            <TextInput
              id="paymentDay"
              name="paymentDay"
              type="number"
              min="1"
              max="31"
              defaultValue={initial?.paymentDay}
            />
          </Field>
        </div>

        <Field label="Conditions de paiement (optionnel)" htmlFor="paymentTerms">
          <TextInput id="paymentTerms" name="paymentTerms" defaultValue={initial?.paymentTerms} />
        </Field>
      </section>

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
