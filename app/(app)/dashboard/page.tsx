import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_TYPES } from "@/lib/validation/activities";
import { ensureCalendarEvents } from "@/lib/calendar/sync";
import { eventStatusLabel } from "@/lib/validation/calendar";
import { TASK_PRIORITY_STYLES, taskPriorityLabel } from "@/lib/validation/tasks";
import { ensureIncomeEntries } from "@/lib/finances/sync";

function typeLabel(type: string) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: activities }] = await Promise.all([
    supabase.from("profiles").select("full_name, timezone").eq("id", user!.id).single(),
    supabase
      .from("activities")
      .select("id, name, type, color, activity_compensation(amount, currency, frequency)")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const hasActivities = (activities ?? []).length > 0;
  const timezone = profile?.timezone ?? "UTC";
  const todayISO = DateTime.now().setZone(timezone).toISODate()!;

  let todayEvents: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    status: string;
    activity: { color: string | null } | null;
  }[] = [];

  if (hasActivities) {
    await ensureCalendarEvents(supabase, user!.id, todayISO, todayISO, timezone);
    const { data } = await supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, status, activities(color)")
      .eq("user_id", user!.id)
      .gte("starts_at", DateTime.fromISO(todayISO, { zone: timezone }).startOf("day").toUTC().toISO()!)
      .lte("starts_at", DateTime.fromISO(todayISO, { zone: timezone }).endOf("day").toUTC().toISO()!)
      .order("starts_at", { ascending: true });

    todayEvents = (data ?? []).map((e) => ({
      ...e,
      activity: Array.isArray(e.activities) ? e.activities[0] ?? null : e.activities,
    }));
  }

  const { data: urgentTasks } = await supabase
    .from("tasks")
    .select("id, title, priority, due_date")
    .eq("user_id", user!.id)
    .in("status", ["todo", "in_progress"])
    .lte("due_date", todayISO)
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(5);

  await ensureIncomeEntries(supabase, user!.id, DateTime.fromISO(todayISO).minus({ months: 1 }).startOf("month").toISODate()!, todayISO);
  const { data: lateIncome } = await supabase
    .from("income")
    .select("id, label, amount, currency, due_date")
    .eq("user_id", user!.id)
    .eq("received", false)
    .lte("due_date", todayISO)
    .order("due_date", { ascending: true })
    .limit(5);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink-950">
        Bonjour {profile?.full_name?.split(" ")[0] ?? ""}
      </h1>
      <p className="mb-8 text-ink-500">Voici votre vue d'ensemble.</p>

      {urgentTasks && urgentTasks.length > 0 ? (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-danger">
              Tâches en retard ou dues aujourd&apos;hui
            </h2>
            <Link href="/tasks" className="text-sm font-medium text-signal hover:underline">
              Voir toutes les tâches
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {urgentTasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}/edit`}
                  className="flex items-center justify-between rounded-lg border border-danger/30 bg-canvas-raised px-5 py-3 hover:brightness-95"
                >
                  <p className="font-medium text-ink-950">{task.title}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TASK_PRIORITY_STYLES[task.priority]}`}>
                    {taskPriorityLabel(task.priority)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lateIncome && lateIncome.length > 0 ? (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-danger">
              Revenus en retard
            </h2>
            <Link href="/finances" className="text-sm font-medium text-signal hover:underline">
              Voir les finances
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {lateIncome.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/finances/income/${item.id}/edit`}
                  className="flex items-center justify-between rounded-lg border border-danger/30 bg-canvas-raised px-5 py-3 hover:brightness-95"
                >
                  <p className="font-medium text-ink-950">{item.label}</p>
                  <span className="text-sm font-medium text-danger">
                    {item.amount} {item.currency}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hasActivities ? (
        <div className="rounded-lg border border-dashed border-ink-300 px-6 py-12 text-center">
          <p className="mb-1 font-medium text-ink-950">
            Vous n'avez pas encore d'activité
          </p>
          <p className="mb-4 text-sm text-ink-500">
            Commencez par créer votre première activité pour voir apparaître
            votre planning et vos revenus ici.
          </p>
          <Link
            href="/activities/new"
            className="inline-block rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90"
          >
            + Ajouter une activité
          </Link>
        </div>
      ) : (
        <section>
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                Aujourd&apos;hui
              </h2>
              <Link href="/calendar" className="text-sm font-medium text-signal hover:underline">
                Voir le calendrier
              </Link>
            </div>
            {todayEvents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink-300 px-5 py-4 text-sm text-ink-500">
                Rien de prévu aujourd&apos;hui.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {todayEvents.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/calendar/${event.id}`}
                      style={{ borderLeftColor: event.activity?.color ?? "#1E3A5F", borderLeftWidth: 3 }}
                      className="flex items-center justify-between rounded-lg border border-ink-100 bg-canvas-raised px-5 py-3 hover:brightness-95"
                    >
                      <div>
                        <p className="font-medium text-ink-950">{event.title}</p>
                        <p className="text-sm text-ink-500">
                          {DateTime.fromISO(event.starts_at, { zone: timezone }).toFormat("HH:mm")} –{" "}
                          {DateTime.fromISO(event.ends_at, { zone: timezone }).toFormat("HH:mm")}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-ink-500">{eventStatusLabel(event.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Vos activités ({activities!.length})
            </h2>
            <Link href="/activities" className="text-sm font-medium text-signal hover:underline">
              Tout voir
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {activities!.map((activity) => {
              const comp = Array.isArray(activity.activity_compensation)
                ? activity.activity_compensation[0]
                : activity.activity_compensation;
              return (
                <li
                  key={activity.id}
                  className="flex items-center gap-3 rounded-lg border border-ink-100 bg-canvas-raised px-5 py-3"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-ink-950">{activity.name}</p>
                    <p className="text-sm text-ink-500">{typeLabel(activity.type)}</p>
                  </div>
                  {comp ? (
                    <p className="text-sm font-medium text-ink-700">
                      {comp.amount} {comp.currency}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <p className="mt-6 text-sm text-ink-500">
            <Link href="/finances" className="font-medium text-signal hover:underline">
              Voir le détail des finances
            </Link>{" "}
            — les statistiques et rapports rejoindront ce tableau de bord en Phase 6.
          </p>
        </section>
      )}
    </div>
  );
}
