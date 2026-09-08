import { createClient } from "@/lib/supabase/server";
import { ActivityForm } from "@/components/shared/activity-form";
import { createActivity } from "../actions";

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: { onboarding?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: currencies }, { data: profile }] = await Promise.all([
    supabase.from("currencies").select("code, name, symbol").order("name"),
    supabase.from("profiles").select("default_currency").eq("id", user!.id).single(),
  ]);

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
        action={createActivity}
      />
    </div>
  );
}
