import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { ActivitiesClientView, ActivityViewItem } from "@/components/shared/activities-client-view";

export default async function ActivitiesPage() {
  const user = await requireCurrentUser();
  const supabase = createClient();
  const todayISO = new Date().toISOString().slice(0, 10);

  const { data: activities } = await supabase
    .from("activities")
    .select(
      "id, name, type, color, status, work_mode, start_date, end_date, organizations(name), activity_compensation(amount, currency, frequency)"
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

    // Détection automatique du statut expiré si la date d'échéance est révolue
    let effectiveStatus = a.status;
    if (a.status === "active" && a.end_date && a.end_date < todayISO) {
      effectiveStatus = "expired";
    }

    return {
      id: a.id,
      name: a.name,
      type: a.type,
      color: a.color,
      status: effectiveStatus,
      work_mode: a.work_mode,
      startDate: a.start_date,
      endDate: a.end_date,
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
