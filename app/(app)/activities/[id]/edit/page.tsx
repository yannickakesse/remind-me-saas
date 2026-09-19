import { notFound } from "next/navigation";
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
      .select("*, organizations(name), contacts(name, phone, email)")
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

  return (
    <div data-tour="edit-activity-container">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-950">Modifier {activity.name}</h1>
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
          address: "",
          workMode: activity.work_mode ?? "onsite",
          location: activity.location ?? "",
          startDate: activity.start_date ?? "",
          endDate: activity.end_date ?? "",
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
        }}
      />
    </div>
  );
}
