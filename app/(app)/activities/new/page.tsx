import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActivityForm } from "@/components/shared/activity-form";
import { createActivity } from "../actions";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { Copy, ArrowLeft, Plus, Sparkles } from "lucide-react";

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: { onboarding?: string; duplicate_from?: string };
}) {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);
  const supabase = createClient();

  const [
    { data: currencies },
    { data: allActiveActivities },
    duplicateSourceData,
  ] = await Promise.all([
    supabase
      .from("currencies")
      .select("code, name, symbol")
      .order("name"),
    supabase
      .from("activities")
      .select("id, name, activity_schedules(weekday, start_time, end_time, variable_hours)")
      .eq("user_id", user!.id)
      .eq("status", "active"),
    searchParams.duplicate_from
      ? Promise.all([
          supabase
            .from("activities")
            .select("*, organizations(name, address), contacts(name, phone, email)")
            .eq("id", searchParams.duplicate_from)
            .eq("user_id", user!.id)
            .maybeSingle(),
          supabase
            .from("activity_schedules")
            .select("weekday, start_time, end_time, break_minutes, recurrence, variable_hours")
            .eq("activity_id", searchParams.duplicate_from),
          supabase
            .from("activity_compensation")
            .select("amount, currency, frequency, payment_day, payment_terms")
            .eq("activity_id", searchParams.duplicate_from)
            .maybeSingle(),
        ])
      : Promise.resolve(null),
  ]);

  const existingActivities = (allActiveActivities ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    schedules: (a.activity_schedules ?? [])
      .filter((s) => !s.variable_hours && s.start_time && s.end_time)
      .map((s) => ({
        weekday: s.weekday,
        startTime: s.start_time.slice(0, 5),
        endTime: s.end_time.slice(0, 5),
      })),
  }));

  const sourceActivity = duplicateSourceData?.[0]?.data;
  const sourceSchedules = duplicateSourceData?.[1]?.data;
  const sourceCompensation = duplicateSourceData?.[2]?.data;

  const isDuplicating = Boolean(sourceActivity);
  const isFirstActivity = searchParams.onboarding === "1";

  const org = sourceActivity
    ? Array.isArray(sourceActivity.organizations)
      ? sourceActivity.organizations[0]
      : sourceActivity.organizations
    : null;
  const contact = sourceActivity
    ? Array.isArray(sourceActivity.contacts)
      ? sourceActivity.contacts[0]
      : sourceActivity.contacts
    : null;

  const initialValues = sourceActivity
    ? {
        name: sourceActivity.name,
        description: sourceActivity.description ?? "",
        category: sourceActivity.category ?? "",
        color: sourceActivity.color ?? "#1E3A5F",
        type: sourceActivity.type,
        organizationName: org?.name ?? "",
        contactName: contact?.name ?? "",
        contactPhone: contact?.phone ?? "",
        contactEmail: contact?.email ?? "",
        address: org?.address ?? "",
        workMode: sourceActivity.work_mode ?? "onsite",
        location: sourceActivity.location ?? "",
        startDate: sourceActivity.start_date ?? "",
        endDate: sourceActivity.end_date ?? "",
        variableHours: sourceSchedules?.[0]?.variable_hours ?? false,
        schedules: (sourceSchedules ?? []).map((s) => ({
          weekday: s.weekday,
          startTime: s.start_time ? s.start_time.slice(0, 5) : "09:00",
          endTime: s.end_time ? s.end_time.slice(0, 5) : "17:00",
          breakMinutes: s.break_minutes ?? 0,
          recurrence: (s.recurrence as "weekly" | "biweekly" | "custom") ?? "weekly",
        })),
        amount: String(sourceCompensation?.amount ?? ""),
        currency: sourceCompensation?.currency ?? "",
        frequency: sourceCompensation?.frequency ?? "monthly",
        paymentDay: sourceCompensation?.payment_day ? String(sourceCompensation.payment_day) : "",
        paymentTerms: sourceCompensation?.payment_terms ?? "",
        validityType: (sourceActivity.validity_type as any) ?? "permanent",
        engagementNature: (sourceActivity.engagement_nature as any) ?? "routine",
        reminderPreference: (sourceActivity.reminder_preference as any) ?? "recommended",
        voiceReminderEnabled: sourceActivity.voice_reminder_enabled ?? true,
      }
    : undefined;

  return (
    <div className="relative isolate min-h-full w-full space-y-6 max-w-4xl">
      {/* Auras d'ambiance en arrière-plan */}
      <div className="absolute top-0 -left-12 w-64 h-64 rounded-full bg-signal/10 dark:bg-signal/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-12 w-72 h-72 rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl pointer-events-none" />

      {/* Navigation retour */}
      <div className="flex items-center justify-between">
        <Link
          href="/activities"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white bg-canvas-raised/80 dark:bg-slate-900/80 border border-ink-200/80 dark:border-white/10 hover:border-signal/40 transition-all shadow-2xs group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Retour au portefeuille d&apos;activités</span>
        </Link>
      </div>

      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-7 shadow-xs">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-signal/15 dark:bg-signal/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isDuplicating ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-signal/15 text-signal border border-signal/25 shadow-2xs">
                  <Copy className="w-3 h-3" />
                  Duplication rapide & modification
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-signal/10 dark:bg-signal/20 text-signal border border-signal/20 shadow-2xs">
                  <Plus className="w-3 h-3" />
                  Configuration de mission
                </span>
              )}
              {isFirstActivity && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  <Sparkles className="w-3 h-3" /> Première étape
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
              {isDuplicating
                ? `Dupliquer « ${sourceActivity?.name} »`
                : isFirstActivity
                ? "Créons votre première activité"
                : "Nouvelle activité"}
            </h1>

            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-1 max-w-2xl">
              {isDuplicating
                ? "Les données de l'activité originale ont été préremplies. Ajustez les jours, créneaux ou rémunération puis enregistrez."
                : isFirstActivity
                ? "Ces informations alimenteront votre calendrier intelligent et vos prévisions de trésorerie."
                : "Renseignez les horaires, modalités d'intervention et rémunération pour un suivi automatisé."}
            </p>
          </div>
        </div>
      </div>

      <ActivityForm
        currencies={currencies ?? []}
        defaultCurrency={profile?.default_currency ?? undefined}
        existingActivities={existingActivities}
        action={createActivity}
        initial={initialValues}
        submitLabel={isDuplicating ? "Créer cette nouvelle activité" : "Créer l'activité"}
      />
    </div>
  );
}

