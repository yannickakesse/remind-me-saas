import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_TYPES } from "@/lib/validation/activities";
import { archiveActivity, restoreActivity } from "./actions";

function typeLabel(type: string) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default async function ActivitiesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: activities } = await supabase
    .from("activities")
    .select(
      "id, name, type, color, status, work_mode, organizations(name), activity_compensation(amount, currency, frequency)"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const active = (activities ?? []).filter((a) => a.status === "active");
  const archived = (activities ?? []).filter((a) => a.status === "archived");

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Activités</h1>
          <p className="text-ink-500">
            Toutes vos sources d'activité et de revenus, au même endroit.
          </p>
        </div>
        <Link
          href="/activities/new"
          className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90"
        >
          + Ajouter une activité
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-300 px-6 py-12 text-center">
          <p className="mb-1 font-medium text-ink-950">
            Vous n'avez pas encore ajouté d'activité
          </p>
          <p className="mb-4 text-sm text-ink-500">
            Commencez par créer votre première activité.
          </p>
          <Link
            href="/activities/new"
            className="inline-block rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90"
          >
            + Ajouter une activité
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((activity) => {
            const comp = Array.isArray(activity.activity_compensation)
              ? activity.activity_compensation[0]
              : activity.activity_compensation;
            const org = Array.isArray(activity.organizations)
              ? activity.organizations[0]
              : activity.organizations;

            return (
              <li
                key={activity.id}
                className="flex items-center justify-between rounded-lg border border-ink-100 bg-canvas-raised px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                  />
                  <div>
                    <p className="font-medium text-ink-950">{activity.name}</p>
                    <p className="text-sm text-ink-500">
                      {typeLabel(activity.type)}
                      {org?.name ? ` · ${org.name}` : ""}
                      {comp ? ` · ${comp.amount} ${comp.currency}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/activities/${activity.id}/edit`}
                    className="text-sm font-medium text-signal hover:underline"
                  >
                    Modifier
                  </Link>
                  <form action={archiveActivity.bind(null, activity.id)}>
                    <button
                      type="submit"
                      className="text-sm text-ink-500 hover:text-danger hover:underline"
                    >
                      Archiver
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {archived.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Archivées
          </h2>
          <ul className="flex flex-col gap-2">
            {archived.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between rounded-lg border border-ink-100 px-5 py-3 opacity-70"
              >
                <p className="text-ink-700">{activity.name}</p>
                <form action={restoreActivity.bind(null, activity.id)}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-signal hover:underline"
                  >
                    Restaurer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
