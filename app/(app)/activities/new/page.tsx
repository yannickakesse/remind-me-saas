import { createClient } from "@/lib/supabase/server";
import { ActivityForm } from "@/components/shared/activity-form";
import { createActivity } from "../actions";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: { onboarding?: string };
}) {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);
  const supabase = createClient();

  const [{ data: currencies }, { data: allActiveActivities }] = await Promise.all([
    supabase
      .from("currencies")
      .select("code, name, symbol")
      .order("name"),
    supabase
      .from("activities")
      .select("id, name, activity_schedules(weekday, start_time, end_time, variable_hours)")
      .eq("user_id", user!.id)
      .eq("status", "active"),
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

  const isFirstActivity = searchParams.onboarding === "1";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-950">
          {isFirstActivity ? "Créons votre première activité" : "Nouvelle activité"}
        </h1>
        <p className="text-ink-500">
          {isFirstActivity
            ? "Ces informations alimenteront votre calendrier et vos revenus prévisionnels."
            : "Renseignez les horaires et la rémunération pour un suivi automatique."}
        </p>
      </div>

      <ActivityForm
        currencies={currencies ?? []}
        defaultCurrency={profile?.default_currency ?? undefined}
        existingActivities={existingActivities}
        action={createActivity}
      />
    </div>
  );
}
