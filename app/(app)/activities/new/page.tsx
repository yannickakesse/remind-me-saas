import { createClient } from "@/lib/supabase/server";
import { ActivityForm } from "@/components/shared/activity-form";
import { createActivity } from "../actions";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { Copy } from "lucide-react";

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
            .select("*, organizations(name), contacts(name, phone, email)")
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
        address: "",
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
        voiceReminderEnabled: sourceActivity.voice_reminder_enabled ?? true,
      }
    : undefined;

  return (
    <div>
      <div className="mb-8">
        {isDuplicating ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20">
                <Copy className="w-3 h-3" />
                Duplication rapide & modification
              </span>
            </div>
            <h1 className="text-2xl font-bold text-ink-950">
              Dupliquer « {sourceActivity?.name} »
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              Les données de l'activité originale ont été préremplies. Modifiez le jour, les horaires ou les détails selon vos besoins puis enregistrez la nouvelle activité.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold text-ink-950">
              {isFirstActivity ? "Créons votre première activité" : "Nouvelle activité"}
            </h1>
            <p className="text-ink-500">
              {isFirstActivity
                ? "Ces informations alimenteront votre calendrier et vos revenus prévisionnels."
                : "Renseignez les horaires et la rémunération pour un suivi automatique."}
            </p>
          </div>
        )}
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

