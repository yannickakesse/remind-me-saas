import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { ActivitiesClientView, ActivityViewItem } from "@/components/shared/activities-client-view";

export default async function ActivitiesPage() {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const { data: activities } = await supabase
    .from("activities")
    .select(
      "id, name, type, color, status, work_mode, organizations(name), activity_compensation(amount, currency, frequency)"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const initialActivities: ActivityViewItem[] = (activities ?? []).map((a) => {
    const comp = Array.isArray(a.activity_compensation)
      ? a.activity_compensation[0]
      : a.activity_compensation;
    const org = Array.isArray(a.organizations)
      ? a.organizations[0]
      : a.organizations;

    return {
      id: a.id,
      name: a.name,
      type: a.type,
      color: a.color,
      status: a.status,
      work_mode: a.work_mode,
      organizationName: org?.name ?? null,
      compensation: comp
        ? {
            amount: Number(comp.amount),
            currency: comp.currency,
            frequency: comp.frequency,
          }
        : null,
    };
  });

  return <ActivitiesClientView initialActivities={initialActivities} />;
}
