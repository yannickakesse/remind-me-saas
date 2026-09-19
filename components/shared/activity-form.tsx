"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Clock, Plus, Trash2 } from "lucide-react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
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
  deleteAction?: () => Promise<void>;
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
  deleteAction,
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
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initial?.organizationName ||
      initial?.contactName ||
      initial?.description ||
      initial?.startDate ||
      initial?.endDate ||
      initial?.address ||
      initial?.location ||
      initial?.paymentTerms ||
      initial?.category
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("color", color);
    formData.set("schedulesJson", JSON.stringify(schedules));

    try {
      await action(formData);
    } catch (err: any) {
      if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
        return;
      }
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Une erreur est survenue lors de l'enregistrement.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6 sm:gap-8">
      {/* ---- Informations Essentielles ---- */}
      <section className="rounded-xl border border-ink-200/80 bg-canvas p-4 sm:p-6 shadow-sm flex flex-col gap-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Informations principales
        </h2>

        <Field label="Nom de l'activité *" htmlFor="name">
          <TextInput
            id="name"
            name="name"
            placeholder="Ex : Développeur Freelance, Cours de Math, Consultante..."
            defaultValue={initial?.name}
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Type d'activité *" htmlFor="type">
            <select
              id="type"
              name="type"
              defaultValue={initial?.type ?? ACTIVITY_TYPES[0].value}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2 text-ink-950 focus:border-signal"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Couleur visuelle
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Couleur ${c}`}
                  aria-pressed={color === c}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-transform hover:scale-105"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Rémunération Principale ---- */}
      <section className="rounded-xl border border-ink-200/80 bg-canvas p-4 sm:p-6 shadow-sm flex flex-col gap-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Rémunération
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Montant *" htmlFor="amount">
            <TextInput
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              defaultValue={initial?.amount}
              required
            />
          </Field>

          <Field label="Devise *" htmlFor="currency">
            <select
              id="currency"
              name="currency"
              defaultValue={initial?.currency ?? defaultCurrency}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2 text-ink-950 focus:border-signal"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fréquence *" htmlFor="frequency">
            <select
              id="frequency"
              name="frequency"
              defaultValue={initial?.frequency ?? "monthly"}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2 text-ink-950 focus:border-signal"
            >
              {COMPENSATION_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* ---- Horaires / Créneaux ---- */}
      <section className="rounded-xl border border-ink-200/80 bg-canvas p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-ink-400" /> Horaires & Planning (optionnel)
          </h2>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
          <input
            type="checkbox"
            name="variableHours"
            checked={variableHours}
            onChange={(e) => setVariableHours(e.target.checked)}
            className="rounded border-ink-300 text-signal focus:ring-signal"
          />
          Mes horaires varient d'une semaine à l'autre (pas de créneau fixe)
        </label>

        {!variableHours && (
          <div className="flex flex-col gap-3 pt-1">
            {schedules.map((row, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-lg border border-ink-200 bg-canvas-raised p-3.5"
              >
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs font-medium text-ink-600 block mb-1">Jour</label>
                  <select
                    value={row.weekday}
                    onChange={(e) => updateSchedule(i, { weekday: Number(e.target.value) })}
                    className="w-full rounded-md border border-ink-300 bg-canvas px-2.5 py-1.5 text-sm"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 flex-1">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-ink-600 block mb-1">Début</label>
                    <input
                      type="time"
                      value={row.startTime}
                      onChange={(e) => updateSchedule(i, { startTime: e.target.value })}
                      className="w-full rounded-md border border-ink-300 bg-canvas px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-ink-600 block mb-1">Fin</label>
                    <input
                      type="time"
                      value={row.endTime}
                      onChange={(e) => updateSchedule(i, { endTime: e.target.value })}
                      className="w-full rounded-md border border-ink-300 bg-canvas px-2.5 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-28 flex items-center justify-between sm:justify-start gap-2">
                  <div className="flex-1 sm:w-20">
                    <label className="text-xs font-medium text-ink-600 block mb-1">Pause (min)</label>
                    <input
                      type="number"
                      min={0}
                      value={row.breakMinutes}
                      onChange={(e) => updateSchedule(i, { breakMinutes: Number(e.target.value) })}
                      className="w-full rounded-md border border-ink-300 bg-canvas px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSchedule(i)}
                    aria-label="Supprimer ce créneau"
                    className="p-1.5 text-danger hover:bg-danger/10 rounded-md transition-colors sm:mt-5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addSchedule}
              className="self-start"
            >
              <Plus className="w-4 h-4 mr-1" /> Ajouter un créneau
            </Button>
          </div>
        )}
      </section>

      {/* ---- Accordéon : Détails complémentaires (optionnels) ---- */}
      <section className="rounded-xl border border-ink-200/80 bg-canvas overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-ink-50/50 transition-colors"
        >
          <div>
            <h3 className="text-sm font-semibold text-ink-800">
              Détails complémentaires (optionnel)
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Description, client, contact, lieu de travail et dates
            </p>
          </div>
          {showAdvanced ? (
            <ChevronUp className="w-5 h-5 text-ink-500 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-ink-500 shrink-0" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-4 sm:p-6 border-t border-ink-100 flex flex-col gap-5 bg-canvas-subtle/30">
            <Field label="Description de l'activité (optionnel)" htmlFor="description">
              <textarea
                id="description"
                name="description"
                placeholder="Notes ou détails sur vos missions..."
                defaultValue={initial?.description}
                rows={2}
                className="w-full rounded-md border border-ink-300 bg-canvas px-3 py-2 text-ink-950 placeholder:text-ink-400 focus:border-signal"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Entreprise / Client" htmlFor="organizationName">
                <TextInput
                  id="organizationName"
                  name="organizationName"
                  defaultValue={initial?.organizationName}
                  placeholder="Ex : Acme SARL"
                />
              </Field>

              <Field label="Catégorie métier" htmlFor="category">
                <TextInput
                  id="category"
                  name="category"
                  defaultValue={initial?.category}
                  placeholder="Ex : Tech, Conseil, Formation"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Nom du contact" htmlFor="contactName">
                <TextInput id="contactName" name="contactName" defaultValue={initial?.contactName} />
              </Field>
              <Field label="Téléphone contact" htmlFor="contactPhone">
                <TextInput id="contactPhone" name="contactPhone" defaultValue={initial?.contactPhone} />
              </Field>
              <Field label="Email contact" htmlFor="contactEmail">
                <TextInput
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  defaultValue={initial?.contactEmail}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Mode de travail" htmlFor="workMode">
                <select
                  id="workMode"
                  name="workMode"
                  defaultValue={initial?.workMode ?? "onsite"}
                  className="w-full rounded-md border border-ink-300 bg-canvas px-3 py-2 text-ink-950 focus:border-signal"
                >
                  <option value="onsite">Présentiel</option>
                  <option value="remote">Télétravail</option>
                  <option value="hybrid">Hybride</option>
                </select>
              </Field>
              <Field label="Lieu / Ville" htmlFor="location">
                <TextInput id="location" name="location" defaultValue={initial?.location} />
              </Field>
            </div>

            <Field label="Adresse physique" htmlFor="address">
              <TextInput id="address" name="address" defaultValue={initial?.address} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date de début" htmlFor="startDate">
                <TextInput id="startDate" name="startDate" type="date" defaultValue={initial?.startDate} />
              </Field>
              <Field label="Date de fin" htmlFor="endDate">
                <TextInput id="endDate" name="endDate" type="date" defaultValue={initial?.endDate} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Jour habituel de paiement (1-31)" htmlFor="paymentDay">
                <TextInput
                  id="paymentDay"
                  name="paymentDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex : 30"
                  defaultValue={initial?.paymentDay}
                />
              </Field>
              <Field label="Conditions de règlement" htmlFor="paymentTerms">
                <TextInput
                  id="paymentTerms"
                  name="paymentTerms"
                  placeholder="Ex : Virement à 30 jours"
                  defaultValue={initial?.paymentTerms}
                />
              </Field>
            </div>
          </div>
        )}
      </section>

      {error ? (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger font-medium">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-ink-100">
        <div>
          {deleteAction ? (
            <div>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={submitting || deleting}
                  className="text-danger hover:bg-danger/10 border-danger/20 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer cette activité
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-danger/5 border border-danger/20 p-2 rounded-xl">
                  <span className="text-xs text-danger font-medium">Confirmer la suppression ?</span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    loading={deleting}
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await deleteAction();
                      } catch (err: any) {
                        setError(err.message || "Erreur lors de la suppression.");
                        setDeleting(false);
                        setShowDeleteConfirm(false);
                      }
                    }}
                  >
                    Oui, supprimer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={deleting}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={submitting || deleting}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting || deleting}
            data-tour="activity-form-submit"
            className="w-full sm:w-auto sm:min-w-[180px]"
          >
            {submitting ? "Enregistrement..." : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
