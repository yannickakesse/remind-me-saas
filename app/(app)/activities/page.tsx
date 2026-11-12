import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { ActivitiesClientView, ActivityViewItem } from "@/components/shared/activities-client-view";
import { JourneyVoice } from "@/components/onboarding/journey-voice";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams?: { renew?: string };
}) {
  const user = await requireCurrentUser();
  const supabase = createClient();
  const todayISO = new Date().toISOString().slice(0, 10);
  const renewActivityId = searchParams?.renew;

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select(
      "id, name, type, category, color, status, work_mode, start_date, end_date, validity_type, engagement_nature, reminder_preference, organizations(name), activity_compensation(amount, currency, frequency)"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  // Une erreur de lecture ne doit jamais se déguiser en « aucune activité » : on affiche l'écran d'erreur
  if (activitiesError) {
    console.error("[activities] lecture impossible:", activitiesError.message);
    throw new Error("Impossible de charger vos activités pour le moment. Réessayez dans un instant.");
  }

  // Récupérer les suggestions d'évolution vers une routine en attente
  const { data: rawSuggestions } = await supabase
    .from("notifications")
    .select("id, entity_id, title, body, metadata, created_at")
    .eq("user_id", user!.id)
    .eq("kind", "activity_routine_suggestion")
    .in("status", ["unread", "read"]);

  const routineSuggestions = (rawSuggestions ?? [])
    .filter((s) => Boolean(s.entity_id))
    .map((s) => ({
      id: s.id,
      activityId: s.entity_id as string,
      title: s.title,
      body: s.body,
      metadata: s.metadata,
    }));

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
      validity_type: a.validity_type,
      engagement_nature: a.engagement_nature,
      reminder_preference: a.reminder_preference,
      organizationName: org?.name ?? null,
      category: a.category ?? null,
      compensation: comp
        ? {
            amount: Number(comp.amount),
            currency: comp.currency,
            frequency: comp.frequency,
          }
        : null,
    };
  });

  return (
    <>
      <ActivitiesClientView
        initialActivities={initialActivities}
        initialSuggestions={routineSuggestions}
        initialRenewActivityId={renewActivityId}
      />
      {initialActivities.length === 0 ? (
        <JourneyVoice id="journey_first_activity" />
      ) : (
        <JourneyVoice id="journey_activity_created" after="journey_activity_form" />
      )}
    </>
  );
}
