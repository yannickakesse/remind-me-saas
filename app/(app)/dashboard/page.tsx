import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { formatAmount } from "@/lib/finances/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { AttentionRequired } from "@/components/dashboard/attention-required";
import { typeLabel } from "@/lib/validation/activities";
import { eventStatusLabel } from "@/lib/validation/calendar";
import { taskPriorityLabel, TASK_PRIORITY_STYLES } from "@/lib/validation/tasks";
import type { Notification } from "@/types/database";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, timezone, default_currency")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone ?? "UTC";
  const currency = profile?.default_currency ?? "XOF";
  const now = DateTime.now().setZone(timezone);

  const startOfMonth = now.startOf("month").toISODate()!;
  const endOfMonth = now.endOf("month").toISODate()!;
  const todayIso = now.toISODate()!;

  const [
    { data: activities },
    { data: todayEventsRaw },
    { data: urgentTasks },
    { data: monthIncome },
    { data: monthExpenses },
    { data: lateIncome },
    { data: scheduledExpenses },
    { data: attentionNotifications },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, type, color, activity_compensation(amount, currency)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, status, activities(color, name)")
      .eq("user_id", user.id)
      .gte("starts_at", now.startOf("day").toUTC().toISO()!)
      .lte("starts_at", now.endOf("day").toUTC().toISO()!)
      .order("starts_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, status")
      .eq("user_id", user.id)
      .neq("status", "done")
      .neq("status", "archived")
      .lte("due_date", todayIso)
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("income")
      .select("amount, received")
      .eq("user_id", user.id)
      .gte("due_date", startOfMonth)
      .lte("due_date", endOfMonth),
    supabase
      .from("expenses")
      .select("amount, paid")
      .eq("user_id", user.id)
      .gte("due_date", startOfMonth)
      .lte("due_date", endOfMonth),
    supabase
      .from("income")
      .select("id, label, amount, currency, due_date")
      .eq("user_id", user.id)
      .eq("received", false)
      .lt("due_date", todayIso)
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("scheduled_expenses")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["planned", "due"])
      .order("next_due_date", { ascending: true })
      .limit(5),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .is("read_at", null)
      .neq("status", "resolved")
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const todayEvents = (todayEventsRaw ?? []).map((e) => ({
    ...e,
    activity: Array.isArray(e.activities) ? e.activities[0] ?? null : e.activities,
  }));

  const incomeReceived = (monthIncome ?? [])
    .filter((i) => i.received)
    .reduce((acc, i) => acc + Number(i.amount), 0);
  const incomeExpected = (monthIncome ?? [])
    .filter((i) => !i.received)
    .reduce((acc, i) => acc + Number(i.amount), 0);
  const expensesPaid = (monthExpenses ?? [])
    .filter((e) => e.paid)
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const expensesDue = (monthExpenses ?? [])
    .filter((e) => !e.paid)
    .reduce((acc, e) => acc + Number(e.amount), 0);

  const net = incomeReceived - expensesPaid;
  const hasActivities = (activities?.length ?? 0) > 0;

  const checklistItems = [
    { label: "Créer votre première activité", done: hasActivities, href: "/activities/new" },
    { label: "Configurer votre profil", done: !!profile?.full_name, href: "/settings" },
  ];
  const onboardingComplete = checklistItems.every((item) => item.done);

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full min-w-0">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 truncate">
            Bonjour {profile?.full_name?.split(" ")[0] ?? ""} 👋
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            {now.setLocale("fr").toFormat("cccc d LLLL yyyy")} — Vue d'ensemble de vos activités
          </p>
        </div>
        <QuickActions />
      </div>

      {!onboardingComplete ? (
        <OnboardingChecklist items={checklistItems} />
      ) : null}

      {/* Main KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0">
        <StatCard
          label="Revenus reçus"
          value={formatAmount(incomeReceived, currency)}
          helper={incomeExpected > 0 ? `+${formatAmount(incomeExpected, currency)} attendus` : "À jour"}
          tone="positive"
        />
        <StatCard
          label="Dépenses payées"
          value={formatAmount(expensesPaid, currency)}
          helper={expensesDue > 0 ? `${formatAmount(expensesDue, currency)} prévues` : undefined}
          tone="warning"
        />
        <StatCard
          label="Solde Net"
          value={formatAmount(net, currency)}
          helper="Reçu - Dépensé"
          tone={net >= 0 ? "positive" : "danger"}
        />
        <StatCard
          label="Tâches urgentes"
          value={String(urgentTasks?.length ?? 0)}
          helper="En retard ou aujourd'hui"
          tone={(urgentTasks?.length ?? 0) > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Smart Reminders Attention Required Widget */}
      {attentionNotifications && attentionNotifications.length > 0 ? (
        <AttentionRequired notifications={attentionNotifications as Notification[]} />
      ) : null}

      {/* Grid: Urgences & Prochaines Dépenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tâches urgentes */}
        {urgentTasks && urgentTasks.length > 0 ? (
          <div className="p-4 rounded-xl border border-danger/30 bg-canvas-raised space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-danger flex items-center gap-1.5">
                <span>⚠️</span> Tâches urgentes ({urgentTasks.length})
              </h2>
              <Link href="/tasks" className="text-xs text-signal hover:underline">
                Voir tout
              </Link>
            </div>
            <ul className="space-y-2">
              {urgentTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks/${task.id}/edit`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-ink-100 bg-canvas text-xs hover:border-ink-300 transition-colors"
                  >
                    <span className="font-semibold text-ink-950 truncate mr-2">{task.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${TASK_PRIORITY_STYLES[task.priority]}`}>
                      {taskPriorityLabel(task.priority)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Prochaines Dépenses Programmées */}
        {scheduledExpenses && scheduledExpenses.length > 0 ? (
          <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-1.5">
                <span>⏰</span> Prochaines dépenses programmées
              </h2>
              <Link href="/finances?tab=scheduled" className="text-xs text-signal hover:underline">
                Gérer ({scheduledExpenses.length})
              </Link>
            </div>
            <ul className="space-y-2">
              {scheduledExpenses.slice(0, 4).map((exp) => {
                const daysDiff = Math.ceil(
                  DateTime.fromISO(exp.next_due_date, { zone: timezone })
                    .diff(now.startOf("day"), "days")
                    .days
                );
                const daysLabel =
                  daysDiff < 0
                    ? `En retard de ${Math.abs(daysDiff)} j`
                    : daysDiff === 0
                    ? "Aujourd'hui"
                    : `Dans ${daysDiff} j`;

                return (
                  <li key={exp.id}>
                    <Link
                      href="/finances?tab=scheduled"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-ink-100 bg-canvas text-xs hover:border-ink-300 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-ink-950">{exp.name}</div>
                        <div className="text-[10px] text-ink-500">
                          {exp.category} • Échéance : {exp.next_due_date}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-ink-950">
                          {formatAmount(exp.amount, exp.currency)}
                        </div>
                        <div className={`text-[10px] font-bold ${daysDiff <= 3 ? "text-danger" : "text-ink-500"}`}>
                          {daysLabel}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Today Schedule & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aujourd'hui */}
        <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-1.5">
              <span>📅</span> Aujourd'hui
            </h2>
            <Link href="/calendar" className="text-xs text-signal hover:underline">
              Calendrier
            </Link>
          </div>

          {todayEvents.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-400">
              Rien de prévu aujourd'hui.
            </div>
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/calendar/${event.id}`}
                    style={{ borderLeftColor: event.activity?.color ?? "#1E3A5F", borderLeftWidth: 3 }}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-ink-100 bg-canvas text-xs hover:border-ink-300 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-ink-950">{event.title}</div>
                      <div className="text-[10px] text-ink-500">
                        {DateTime.fromISO(event.starts_at, { zone: timezone }).toFormat("HH:mm")} –{" "}
                        {DateTime.fromISO(event.ends_at, { zone: timezone }).toFormat("HH:mm")}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-ink-500">
                      {eventStatusLabel(event.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Vos Activités */}
        <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-1.5">
              <span>🎯</span> Vos activités ({activities?.length ?? 0})
            </h2>
            <Link href="/activities" className="text-xs text-signal hover:underline">
              Gérer
            </Link>
          </div>

          {(activities?.length ?? 0) === 0 ? (
            <div className="p-6 text-center text-xs text-ink-400">
              Aucune activité créée pour le moment.
            </div>
          ) : (
            <ul className="space-y-2">
              {activities!.map((activity) => {
                const comp = Array.isArray(activity.activity_compensation)
                  ? activity.activity_compensation[0]
                  : activity.activity_compensation;
                return (
                  <li
                    key={activity.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-ink-100 bg-canvas text-xs"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                    />
                    <div className="flex-1 truncate">
                      <div className="font-semibold text-ink-950 truncate">{activity.name}</div>
                      <div className="text-[10px] text-ink-500">{typeLabel(activity.type)}</div>
                    </div>
                    {comp ? (
                      <div className="font-bold text-ink-900">
                        {formatAmount(comp.amount, comp.currency)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
