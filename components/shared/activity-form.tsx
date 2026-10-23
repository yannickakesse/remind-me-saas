"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Clock, Plus, Trash2, AlertTriangle, Volume2 } from "lucide-react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_TYPES,
  COMPENSATION_FREQUENCIES,
  WEEKDAYS,
  VALIDITY_TYPES,
  ENGAGEMENT_NATURES,
  REMINDER_PREFERENCES,
} from "@/lib/validation/activities";
import type { ValidityType, EngagementNature, ReminderPreference } from "@/types/database";

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
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string } | void>;
  deleteAction?: () => Promise<{ success?: boolean; error?: string } | void>;
  existingActivities?: {
    id: string;
    name: string;
    schedules: { weekday: number; startTime: string; endTime: string }[];
  }[];
  currentActivityId?: string;
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
    validityType?: ValidityType;
    engagementNature?: EngagementNature;
    reminderPreference?: ReminderPreference;
    variableHours: boolean;
    schedules: ScheduleRow[];
    amount: string;
    currency: string;
    frequency: string;
    paymentDay: string;
    paymentTerms: string;
    voiceReminderEnabled?: boolean;
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
  existingActivities = [],
  currentActivityId,
  initial,
  submitLabel = "Créer l'activité",
}: ActivityFormProps) {
  const router = useRouter();

  const [color, setColor] = useState(initial?.color ?? COLORS[0]!);
  const [validityType, setValidityType] = useState<ValidityType>(
    initial?.validityType ?? (initial?.endDate ? "temporary" : "permanent")
  );
  const [engagementNature, setEngagementNature] = useState<EngagementNature>(
    initial?.engagementNature ?? "routine"
  );
  const [reminderPreference, setReminderPreference] = useState<ReminderPreference>(
    initial?.reminderPreference ?? "recommended"
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [variableHours, setVariableHours] = useState(
    initial?.variableHours ?? false
  );
  const [voiceReminderEnabled, setVoiceReminderEnabled] = useState(
    initial?.voiceReminderEnabled ?? true
  );
  const [schedules, setSchedules] = useState<ScheduleRow[]>(
    initial?.schedules ?? []
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initial?.organizationName ||
      initial?.contactName ||
      initial?.description ||
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

  // Vérification temps réel des conflits internes ET avec les autres activités
  const scheduleConflict = useMemo(() => {
    if (variableHours || schedules.length === 0) return null;

    // 1. Vérification interne (au sein de cette activité)
    for (let i = 0; i < schedules.length; i++) {
      const s1 = schedules[i]!;
      if (s1.endTime <= s1.startTime) {
        const day = WEEKDAYS.find((w) => w.value === s1.weekday)?.label ?? `Jour ${s1.weekday}`;
        return `L'heure de fin (${s1.endTime}) doit être après l'heure de début (${s1.startTime}) le ${day}.`;
      }
      for (let j = i + 1; j < schedules.length; j++) {
        const s2 = schedules[j]!;
        if (s1.weekday === s2.weekday) {
          if (s1.startTime < s2.endTime && s2.startTime < s1.endTime) {
            const day = WEEKDAYS.find((w) => w.value === s1.weekday)?.label ?? `Jour ${s1.weekday}`;
            return `Chevauchement d'horaires : Deux créneaux se chevauchent le ${day} (${s1.startTime}–${s1.endTime} et ${s2.startTime}–${s2.endTime}).`;
          }
        }
      }
    }

    // 2. Vérification externe (avec les autres activités existantes)
    if (existingActivities && existingActivities.length > 0) {
      for (const candidate of schedules) {
        const cStart = candidate.startTime.slice(0, 5);
        const cEnd = candidate.endTime.slice(0, 5);
        for (const other of existingActivities) {
          if (currentActivityId && other.id === currentActivityId) continue;
          for (const otherSlot of other.schedules) {
            if (otherSlot.weekday === candidate.weekday) {
              const oStart = otherSlot.startTime.slice(0, 5);
              const oEnd = otherSlot.endTime.slice(0, 5);
              if (cStart < oEnd && oStart < cEnd) {
                const day = WEEKDAYS.find((w) => w.value === candidate.weekday)?.label ?? `Jour ${candidate.weekday}`;
                return `Conflit d'horaires : Le créneau du ${day} (${cStart}–${cEnd}) chevauche votre activité « ${other.name} » (${oStart}–${oEnd}). Veuillez choisir une autre heure.`;
              }
            }
          }
        }
      }
    }

    return null;
  }, [schedules, variableHours, existingActivities, currentActivityId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (scheduleConflict) {
      setError(scheduleConflict);
      return;
    }
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("color", color);
    formData.set("validityType", validityType);
    formData.set("engagementNature", engagementNature);
    formData.set("reminderPreference", reminderPreference);
    formData.set("startDate", startDate);
    formData.set("endDate", validityType === "permanent" ? "" : endDate);
    formData.set("schedulesJson", JSON.stringify(schedules));
    formData.set("voiceReminderEnabled", voiceReminderEnabled ? "on" : "off");

    try {
      const res = await action(formData);
      if (res && res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      router.push("/activities");
      router.refresh();
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
      <section className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-7 shadow-xs flex flex-col gap-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
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
              className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-ink-950 dark:text-white focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal transition-colors shadow-2xs cursor-pointer"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-bold text-zinc-950 dark:text-white transition-colors">
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
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-all hover:scale-110 active:scale-95 shadow-2xs cursor-pointer ${
                    color === c ? "ring-2 ring-offset-2 ring-signal dark:ring-offset-slate-900 scale-105" : ""
                  }`}
                  style={{
                    backgroundColor: c,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Validité & Nature de l'engagement ---- */}
      <section className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-7 shadow-xs flex flex-col gap-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
            Validité & Nature de l'engagement
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Définissez la durée et le niveau de suivi pour adapter les rappels et les séances.
          </p>
        </div>

        {/* 1. Type de validité : Permanent vs Temporaire */}
        <div className="flex flex-col gap-2">
          <label className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white">
            Durée de validité de l'activité *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                validityType === "permanent"
                  ? "border-signal bg-signal/10 dark:bg-signal/15 text-ink-950 dark:text-white ring-1 ring-signal/30 shadow-xs"
                  : "border-ink-200/90 dark:border-white/10 bg-canvas-raised/80 dark:bg-slate-800/40 text-ink-700 dark:text-ink-300 hover:border-ink-300 dark:hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="validityType"
                value="permanent"
                checked={validityType === "permanent"}
                onChange={() => setValidityType("permanent")}
                className="mt-1 text-signal focus:ring-signal"
              />
              <div>
                <span className="font-bold text-sm block text-ink-950 dark:text-white">Permanent</span>
                <span className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed block mt-0.5">
                  Durée indéfinie (emploi, routine, activité stable). Pas de date de fin obligatoire.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                validityType === "temporary"
                  ? "border-signal bg-signal/10 dark:bg-signal/15 text-ink-950 dark:text-white ring-1 ring-signal/30 shadow-xs"
                  : "border-ink-200/90 dark:border-white/10 bg-canvas-raised/80 dark:bg-slate-800/40 text-ink-700 dark:text-ink-300 hover:border-ink-300 dark:hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="validityType"
                value="temporary"
                checked={validityType === "temporary"}
                onChange={() => setValidityType("temporary")}
                className="mt-1 text-signal focus:ring-signal"
              />
              <div>
                <span className="font-bold text-sm block text-ink-950 dark:text-white">Engagement temporaire</span>
                <span className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed block mt-0.5">
                  Mission bornée dans le temps (date de fin obligatoire). Arrête les créneaux futurs à l'échéance.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Dates début et fin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Field label="Date de début" htmlFor="startDate">
            <TextInput
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>

          {validityType === "temporary" ? (
            <Field label="Date de fin * (obligatoire)" htmlFor="endDate">
              <TextInput
                id="endDate"
                name="endDate"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          ) : (
            <div className="flex flex-col justify-end pb-2">
              <p className="text-xs text-ink-400 italic">
                Activité permanente : les séances se poursuivent sans interruption.
              </p>
            </div>
          )}
        </div>

        {/* 2. Nature de l'engagement & 3. Préférences de rappel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Field label="Nature de l'engagement *" htmlFor="engagementNature">
            <select
              id="engagementNature"
              name="engagementNature"
              value={engagementNature}
              onChange={(e) => setEngagementNature(e.target.value as EngagementNature)}
              className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised dark:bg-slate-900 px-3.5 py-2.5 text-ink-950 dark:text-white focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal text-sm shadow-2xs cursor-pointer transition-colors"
            >
              {ENGAGEMENT_NATURES.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Préférence de rappel *" htmlFor="reminderPreference">
            <select
              id="reminderPreference"
              name="reminderPreference"
              value={reminderPreference}
              onChange={(e) => setReminderPreference(e.target.value as ReminderPreference)}
              className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised dark:bg-slate-900 px-3.5 py-2.5 text-ink-950 dark:text-white focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal text-sm shadow-2xs cursor-pointer transition-colors"
            >
              {REMINDER_PREFERENCES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* ---- Rémunération Principale ---- */}
      <section className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-7 shadow-xs flex flex-col gap-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
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
              className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised dark:bg-slate-900 px-3.5 py-2.5 text-ink-950 dark:text-white focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal shadow-2xs cursor-pointer transition-colors"
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
              className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised dark:bg-slate-900 px-3.5 py-2.5 text-ink-950 dark:text-white focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal shadow-2xs cursor-pointer transition-colors"
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
      <section className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-7 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-signal" /> Horaires & Planning (optionnel)
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
                className="flex flex-col sm:flex-row sm:items-end gap-3.5 rounded-2xl border border-ink-200/90 dark:border-white/10 bg-canvas-subtle/60 dark:bg-slate-800/40 p-4 shadow-2xs hover:border-signal/30 transition-all"
              >
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs font-semibold text-ink-600 dark:text-ink-400 block mb-1">Jour</label>
                  <select
                    value={row.weekday}
                    onChange={(e) => updateSchedule(i, { weekday: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3 py-2 text-sm font-medium text-ink-950 dark:text-white focus:border-signal focus:outline-none"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2.5 flex-1">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-ink-600 dark:text-ink-400 block mb-1">Début</label>
                    <input
                      type="time"
                      value={row.startTime}
                      onChange={(e) => updateSchedule(i, { startTime: e.target.value })}
                      className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3 py-2 text-sm font-medium text-ink-950 dark:text-white focus:border-signal focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-ink-600 dark:text-ink-400 block mb-1">Fin</label>
                    <input
                      type="time"
                      value={row.endTime}
                      onChange={(e) => updateSchedule(i, { endTime: e.target.value })}
                      className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3 py-2 text-sm font-medium text-ink-950 dark:text-white focus:border-signal focus:outline-none"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-28 flex items-center justify-between sm:justify-start gap-2">
                  <div className="flex-1 sm:w-20">
                    <label className="text-xs font-semibold text-ink-600 dark:text-ink-400 block mb-1">Pause (min)</label>
                    <input
                      type="number"
                      min={0}
                      value={row.breakMinutes}
                      onChange={(e) => updateSchedule(i, { breakMinutes: Number(e.target.value) })}
                      className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3 py-2 text-sm font-medium text-ink-950 dark:text-white focus:border-signal focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSchedule(i)}
                    aria-label="Supprimer ce créneau"
                    className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors sm:mt-5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {scheduleConflict ? (
              <div role="alert" className="flex items-center gap-2 rounded-lg bg-danger/10 border border-danger/30 p-3 text-xs font-semibold text-danger">
                <AlertTriangle className="w-4 h-4 shrink-0 text-danger" />
                <span>{scheduleConflict}</span>
              </div>
            ) : null}

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

      {/* ---- Rappel Vocal Intelligent ---- */}
      <section className="rounded-3xl border border-signal/30 dark:border-signal/20 bg-signal-soft/15 dark:bg-signal/10 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-signal text-white shrink-0 mt-0.5">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <label htmlFor="voiceReminderEnabled" className="text-sm font-bold text-ink-950 flex items-center gap-2 cursor-pointer">
                Lire ce rappel à voix haute
                <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-signal-soft text-signal border border-signal/20">
                  Synthèse vocale
                </span>
              </label>
              <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                Annoncer automatiquement cette activité par synthèse vocale sur votre appareil au moment du rappel (ex. : « Bonjour Yannick. Vous avez une réunion à 15 heures »).
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              id="voiceReminderEnabled"
              name="voiceReminderEnabled"
              checked={voiceReminderEnabled}
              onChange={(e) => setVoiceReminderEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-ink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-signal"></div>
          </label>
        </div>
      </section>

      {/* ---- Accordéon : Détails complémentaires (optionnels) ---- */}
      <section className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-ink-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div>
            <h3 className="text-sm font-bold text-ink-950 dark:text-white">
              Détails complémentaires (optionnel)
            </h3>
            <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
              Description, client, contact, lieu de travail et conditions de règlement
            </p>
          </div>
          <div className="p-1 rounded-xl bg-ink-100 dark:bg-white/10 text-ink-600 dark:text-ink-300">
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
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
                className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3.5 py-2.5 text-sm text-ink-950 dark:text-white placeholder:text-ink-400 focus:border-signal focus:outline-none transition-colors shadow-2xs"
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
                  className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas dark:bg-slate-900 px-3.5 py-2.5 text-ink-950 dark:text-white focus:border-signal text-sm shadow-2xs cursor-pointer"
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
                        const res = await deleteAction();
                        if (res && res.error) {
                          setError(res.error);
                          setDeleting(false);
                          setShowDeleteConfirm(false);
                          return;
                        }
                        router.push("/activities");
                        router.refresh();
                      } catch (err: any) {
                        if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
                          return;
                        }
                        setError(err?.message || "Erreur lors de la suppression.");
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
            className="w-full sm:w-auto rounded-2xl border border-ink-200/90 dark:border-white/10 dark:bg-slate-800/80 text-ink-700 dark:text-ink-200 hover:bg-canvas dark:hover:bg-slate-700/80 py-2.5 cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting || deleting || Boolean(scheduleConflict)}
            data-tour="activity-form-submit"
            className="w-full sm:w-auto sm:min-w-[180px] rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:shadow-[0_6px_20px_rgba(217,119,6,0.35)] hover:-translate-y-0.5 transition-all font-bold shadow-xs py-2.5 cursor-pointer text-white border border-amber-400/40"
          >
            {submitting
              ? currentActivityId
                ? "Mise à jour en cours..."
                : "Création en cours..."
              : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
