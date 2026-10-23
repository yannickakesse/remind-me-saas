import { notFound } from "next/navigation";
import Link from "next/link";
import { Copy, ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivityForm } from "@/components/shared/activity-form";
import { updateActivity, deleteActivity } from "../../actions";
import { requireCurrentUser } from "@/lib/supabase/auth";

export default async function EditActivityPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const [
    { data: activity },
    { data: schedules },
    { data: compensation },
    { data: currencies },
    { data: allActiveActivities },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("*, organizations(name, address), contacts(name, phone, email)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("activity_schedules")
      .select("weekday, start_time, end_time, break_minutes, recurrence, variable_hours")
      .eq("activity_id", params.id),
    supabase
      .from("activity_compensation")
      .select("amount, currency, frequency, payment_day, payment_terms")
      .eq("activity_id", params.id)
      .maybeSingle(),
    supabase.from("currencies").select("code, name, symbol").order("name"),
    supabase
      .from("activities")
      .select("id, name, activity_schedules(weekday, start_time, end_time, variable_hours)")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  if (!activity) notFound();

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

  const org = Array.isArray(activity.organizations)
    ? activity.organizations[0]
    : activity.organizations;
  const contact = Array.isArray(activity.contacts) ? activity.contacts[0] : activity.contacts;

  const activityColor = activity.color ?? "#E5A91E";

  return (
    <div data-tour="edit-activity-container" className="relative isolate min-h-full w-full space-y-6 max-w-4xl">
      {/* Auras d'ambiance en arrière-plan */}
      <div
        className="absolute top-0 -left-12 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-15"
        style={{ backgroundColor: activityColor }}
      />
      <div className="absolute top-1/3 -right-12 w-72 h-72 rounded-full bg-signal/10 dark:bg-signal/5 blur-3xl pointer-events-none" />

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
        {/* Ligne d'accentuation couleur de l'activité */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: activityColor }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-signal/10 dark:bg-signal/20 text-signal border border-signal/20 shadow-2xs">
                <Pencil className="w-3 h-3" />
                Édition d&apos;activité
              </span>
              <span
                className="h-3.5 w-3.5 rounded-full ring-2 ring-white/20 shadow-2xs"
                style={{ backgroundColor: activityColor }}
                title={`Couleur configurée : ${activityColor}`}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
              Modifier « {activity.name} »
            </h1>

            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-1 max-w-2xl">
              Mettez à jour les horaires, la rémunération, le mode de travail ou les coordonnées du contact.
            </p>
          </div>

          <Link
            href={`/activities/new?duplicate_from=${activity.id}`}
            title="Dupliquer cette activité pour créer une nouvelle occurrence"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-ink-200/90 dark:border-white/10 bg-canvas-subtle/80 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-ink-800 dark:text-ink-200 hover:bg-canvas dark:hover:bg-slate-700/80 hover:border-signal/40 transition-all self-start sm:self-auto shadow-2xs hover:-translate-y-0.5"
          >
            <Copy className="w-3.5 h-3.5 text-signal" />
            <span>Dupliquer pour modifier</span>
          </Link>
        </div>
      </div>

      <ActivityForm
        currencies={currencies ?? []}
        action={updateActivity.bind(null, activity.id)}
        deleteAction={deleteActivity.bind(null, activity.id)}
        existingActivities={existingActivities}
        currentActivityId={activity.id}
        submitLabel="Enregistrer les modifications"
        initial={{
          name: activity.name,
          description: activity.description ?? "",
          category: activity.category ?? "",
          color: activity.color ?? "#1E3A5F",
          type: activity.type,
          organizationName: org?.name ?? "",
          contactName: contact?.name ?? "",
          contactPhone: contact?.phone ?? "",
          contactEmail: contact?.email ?? "",
          address: org?.address ?? "",
          workMode: activity.work_mode ?? "onsite",
          location: activity.location ?? "",
          startDate: activity.start_date ?? "",
          endDate: activity.end_date ?? "",
          validityType: activity.validity_type,
          engagementNature: activity.engagement_nature,
          reminderPreference: activity.reminder_preference,
          variableHours: schedules?.[0]?.variable_hours ?? false,
          schedules: (schedules ?? []).map((s) => ({
            weekday: s.weekday,
            startTime: s.start_time ? s.start_time.slice(0, 5) : "09:00",
            endTime: s.end_time ? s.end_time.slice(0, 5) : "17:00",
            breakMinutes: s.break_minutes ?? 0,
            recurrence: (s.recurrence as "weekly" | "biweekly" | "custom") ?? "weekly",
          })),
          amount: String(compensation?.amount ?? ""),
          currency: compensation?.currency ?? "",
          frequency: compensation?.frequency ?? "monthly",
          paymentDay: compensation?.payment_day ? String(compensation.payment_day) : "",
          paymentTerms: compensation?.payment_terms ?? "",
          voiceReminderEnabled: activity.voice_reminder_enabled ?? true,
        }}
      />
    </div>
  );
}
