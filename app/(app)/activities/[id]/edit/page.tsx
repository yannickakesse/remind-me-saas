import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActivityForm } from "@/components/shared/activity-form";
import { updateActivity } from "../../actions";

export default async function EditActivityPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: activity }, { data: schedules }, { data: compensation }, { data: currencies }] =
    await Promise.all([
      supabase
        .from("activities")
        .select("*, organizations(name), contacts(name, phone, email)")
        .eq("id", params.id)
        .eq("user_id", user!.id)
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
    ]);

  if (!activity) notFound();

  const org = Array.isArray(activity.organizations)
    ? activity.organizations[0]
    : activity.organizations;
  const contact = Array.isArray(activity.contacts) ? activity.contacts[0] : activity.contacts;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-950">Modifier {activity.name}</h1>
      </div>

      <ActivityForm
        currencies={currencies ?? []}
        action={updateActivity.bind(null, activity.id)}
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
            startTime: s.start_time.slice(0, 5),
            endTime: s.end_time.slice(0, 5),
            breakMinutes: s.break_minutes,
            recurrence: s.recurrence as "weekly" | "biweekly" | "custom",
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
