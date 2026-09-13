import Link from "next/link";
import { Briefcase, Building2, Wallet, Plus, Edit3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_TYPES } from "@/lib/validation/activities";
import { archiveActivity, restoreActivity } from "./actions";
import { buttonClasses } from "@/components/ui/button";
import { formatAmount } from "@/lib/finances/format";

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
    <div className="space-y-8">
      {/* En-tête responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Activités & Métiers</h1>
          <p className="text-sm text-ink-500">
            {active.length} activité{active.length > 1 ? "s" : ""} active{active.length > 1 ? "s" : ""} gérée{active.length > 1 ? "s" : ""} au même endroit.
          </p>
        </div>
        <Link href="/activities/new" className={buttonClasses("primary", "md")}>
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter une activité
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 bg-canvas-raised/50 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-signal-soft text-signal">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-ink-950">Vous n'avez pas encore d'activité</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
            Créez votre première activité (salariat, freelance, consulting, enseignement, etc.) pour organiser vos horaires et vos rémunérations.
          </p>
          <div className="mt-5">
            <Link href="/activities/new" className={buttonClasses("primary", "sm")}>
              <Plus className="h-4 w-4 mr-1" />
              Créer une activité
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((activity) => {
            const comp = Array.isArray(activity.activity_compensation)
              ? activity.activity_compensation[0]
              : activity.activity_compensation;
            const org = Array.isArray(activity.organizations)
              ? activity.organizations[0]
              : activity.organizations;

            return (
              <div
                key={activity.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-ink-200 bg-canvas-raised p-5 hover:border-ink-300 hover:shadow-xs transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                      />
                      <h3 className="font-bold text-ink-950 text-base truncate">{activity.name}</h3>
                    </div>
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700 shrink-0">
                      {typeLabel(activity.type)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
                    {org?.name ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-ink-800">
                        <Building2 className="h-3.5 w-3.5 text-ink-500" />
                        {org.name}
                      </span>
                    ) : null}

                    {comp ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-signal">
                        <Wallet className="h-3.5 w-3.5 text-signal" />
                        {formatAmount(comp.amount, comp.currency)} / {comp.frequency === "monthly" ? "mois" : comp.frequency === "hourly" ? "h" : comp.frequency}
                      </span>
                    ) : null}

                    {activity.work_mode ? (
                      <span className="text-ink-400 capitalize">
                        • {activity.work_mode}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink-100">
                  <Link
                    href={`/activities/${activity.id}/edit`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-signal hover:bg-signal-soft transition-colors min-h-[36px] inline-flex items-center"
                  >
                    Modifier
                  </Link>
                  <form action={archiveActivity.bind(null, activity.id)}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-400 hover:text-danger hover:bg-danger-soft/50 transition-colors min-h-[36px] inline-flex items-center"
                    >
                      Archiver
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activités archivées */}
      {archived.length > 0 ? (
        <div className="space-y-3 pt-6 border-t border-ink-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Activités archivées ({archived.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-75">
            {archived.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between rounded-xl border border-ink-200 bg-canvas p-4"
              >
                <span className="font-medium text-ink-700 text-sm">{activity.name}</span>
                <form action={restoreActivity.bind(null, activity.id)}>
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-signal hover:underline min-h-[36px] inline-flex items-center"
                  >
                    Restaurer
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
