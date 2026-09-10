import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_TYPES } from "@/lib/validation/activities";
import { ensureCalendarEvents } from "@/lib/calendar/sync";
import { eventStatusLabel } from "@/lib/validation/calendar";
import { TASK_PRIORITY_STYLES, taskPriorityLabel } from "@/lib/validation/tasks";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { getFinancesForRange, sumByCurrencyAndStatus } from "@/lib/finances/aggregate";
import { formatAmount } from "@/lib/finances/format";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

function typeLabel(type: string) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: activities }] = await Promise.all([
    supabase.from("profiles").select("full_name, timezone, default_currency").eq("id", user!.id).single(),
    supabase
      .from("activities")
      .select("id, name, type, color, activity_compensation(amount, currency, frequency)")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const hasActivities = (activities ?? []).length > 0;
  const timezone = profile?.timezone ?? "UTC";
  const currency = profile?.default_currency ?? "XOF";
  const now = DateTime.now().setZone(timezone);
  const todayISO = now.toISODate()!;
  const monthStartISO = now.startOf("month").toISODate()!;
  const monthEndISO = now.endOf("month").toISODate()!;

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

  const [{ data: urgentTasks }, { count: totalTaskCount }, { count: totalIncomeCount }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, priority, due_date")
      .eq("user_id", user!.id)
      .in("status", ["todo", "in_progress"])
      .lte("due_date", todayISO)
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(5),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("income").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
  ]);

  await ensureIncomeEntries(supabase, user!.id, monthStartISO, monthEndISO);
  const { income: monthIncome, expenses: monthExpenses } = await getFinancesForRange(
    supabase,
    user!.id,
    monthStartISO,
    monthEndISO,
    todayISO
  );
  const incomeTotals = sumByCurrencyAndStatus(monthIncome);
  const expenseTotals = sumByCurrencyAndStatus(monthExpenses);

  const incomeReceived = incomeTotals.get(`received|${currency}`) ?? 0;
  const incomeExpected = (incomeTotals.get(`planned|${currency}`) ?? 0) + (incomeTotals.get(`late|${currency}`) ?? 0);
  const expensesPaid = expenseTotals.get(`received|${currency}`) ?? 0;
  const expensesDue = (expenseTotals.get(`planned|${currency}`) ?? 0) + (expenseTotals.get(`late|${currency}`) ?? 0);
  const net = incomeReceived - expensesPaid;

  const { data: lateIncome } = await supabase
    .from("income")
    .select("id, label, amount, currency, due_date")
    .eq("user_id", user!.id)
    .eq("received", false)
    .lte("due_date", todayISO)
    .order("due_date", { ascending: true })
    .limit(5);

  const checklistItems = [
    { label: "Compte créé", done: true },
    { label: "Créer votre première activité", done: hasActivities, href: "/activities/new" },
    { label: "Ajouter une tâche", done: (totalTaskCount ?? 0) > 0, href: "/tasks/new" },
    { label: "Ajouter un revenu", done: (totalIncomeCount ?? 0) > 0, href: "/finances/income/new" },
  ];
  const onboardingComplete = checklistItems.every((item) => item.done);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-ink-950">
            Bonjour {profile?.full_name?.split(" ")[0] ?? ""} 👋
          </h1>
          <p className="text-ink-500">
            {now.setLocale("fr").toFormat("cccc d LLLL")} — voici votre vue d&apos;ensemble.
          </p>
        </div>
        <QuickActions />
      </div>

      {!onboardingComplete ? (
        <div className="mb-8">
          <OnboardingChecklist items={checklistItems} />
        </div>
      ) : null}

      {hasActivities ? (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Revenus reçus (mois)"
            value={formatAmount(incomeReceived, currency)}
            helper={incomeExpected > 0 ? `${formatAmount(incomeExpected, currency)} attendus` : undefined}
            tone="positive"
          />
          <StatCard
            label="Dépenses payées (mois)"
            value={formatAmount(expensesPaid, currency)}
            helper={expensesDue > 0 ? `${formatAmount(expensesDue, currency)} prévues` : undefined}
            tone="warning"
          />
          <StatCard label="Net (mois)" value={formatAmount(net, currency)} tone={net >= 0 ? "positive" : "danger"} />
          <StatCard
            label="Tâches urgentes"
            value={String(urgentTasks?.length ?? 0)}
            helper="En retard ou dues aujourd'hui"
            tone={(urgentTasks?.length ?? 0) > 0 ? "danger" : "neutral"}
          />
        </div>
      ) : null}

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
                  <span className="text-sm font-medium text-danger">{formatAmount(item.amount, item.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasActivities ? (
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
                    <p className="text-sm font-medium text-ink-700">{formatAmount(comp.amount, comp.currency)}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <p className="mt-6 text-sm text-ink-500">
            <Link href="/reports" className="font-medium text-signal hover:underline">
              Voir les rapports détaillés
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
