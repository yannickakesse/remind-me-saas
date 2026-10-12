import Link from "next/link";
import { DateTime } from "luxon";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatAmount } from "@/lib/finances/format";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { AttentionRequired } from "@/components/dashboard/attention-required";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { ensureNotifications } from "@/lib/notifications/sync";
import { getUserTimezone } from "@/lib/time/timezones";
import { typeLabel } from "@/lib/validation/activities";
import { eventStatusLabel, getContrastTextColor } from "@/lib/validation/calendar";
import { TASK_PRIORITY_STYLES, taskPriorityLabel } from "@/lib/validation/tasks";
import { FloatingMessagesButton } from "@/components/dashboard/floating-messages-button";
import type { Notification } from "@/types/database";

export default async function DashboardPage() {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const supabase = createClient();
  const timezone = getUserTimezone(profile);
  const currency = profile?.default_currency ?? "XOF";
  const now = DateTime.now().setZone(timezone);

  const startOfMonth = now.startOf("month").toISODate()!;
  const endOfMonth = now.endOf("month").toISODate()!;
  const todayIso = now.toISODate()!;

  // Exécution 100% parallélisée des synchronisations et des requêtes Dashboard
  const [
    ,
    ,
    { data: activities },
    { data: todayEventsRaw },
    { data: urgentTasks },
    { data: monthIncome },
    { data: monthExpenses },
    { data: lateIncome },
    { data: scheduledExpenses },
    { data: attentionNotifications },
    { count: unreadMessagesCount },
  ] = await Promise.all([
    ensureIncomeEntries(supabase, user.id, startOfMonth, endOfMonth),
    ensureNotifications(supabase, user.id, timezone),
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
      .in("status", ["todo", "in_progress"])
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
      .eq("status", "unread")
      .is("read_at", null)
      .neq("status", "resolved")
      .neq("status", "dismissed")
      .in("category", ["payment", "expense", "scheduled_expense", "finance", "financial"])
      .order("created_at", { ascending: false })
      .limit(6),
    (supabase as any)
      .from("internal_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
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
    <div className="relative isolate min-h-full w-full space-y-5 max-w-7xl mx-auto min-w-0">
      {/* Fond d'écran global du Dashboard */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none -z-10"
        style={{ backgroundImage: "url('/images/backgrounds/dashboard-bg.jpg')" }}
      />

      {/* Top Welcome & Quick Actions (Localized & Reactive) */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md p-5 sm:p-7 shadow-xs">
        <DashboardHeader userName={profile?.full_name} timezone={timezone} />
      </div>

      {!onboardingComplete ? (
        <div data-tour="dashboard-onboarding">
          <OnboardingChecklist items={checklistItems} />
        </div>
      ) : null}

      {/* Main KPI Stats (Localized & Reactive) */}
      <DashboardKpis
        incomeExpected={incomeExpected}
        incomeReceived={incomeReceived}
        expensesPaid={expensesPaid}
        net={net}
        currency={currency}
      />

      {/* 1. Attention requise (Conditionnel : Uniquement si paiements/règlements en attente) */}
      {attentionNotifications && attentionNotifications.length > 0 ? (
        <div data-tour="dashboard-attention">
          <AttentionRequired notifications={attentionNotifications as Notification[]} />
        </div>
      ) : null}

      {/* 2. SECTION AUJOURD'HUI (Planning, Agenda & Tâches prioritaires du jour) */}
      <section className="space-y-3" aria-labelledby="today-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-signal/10 text-signal">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 id="today-heading" className="text-sm font-bold uppercase tracking-wider text-ink-800 dark:text-ink-200">
              Aujourd&apos;hui • {now.setLocale("fr").toFormat("cccc d MMMM yyyy")}
            </h2>
          </div>
          <Link
            href="/calendar"
            className="text-xs font-semibold text-signal hover:underline flex items-center gap-1"
          >
            Planning complet <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Agenda & Séances du jour */}
          <div
            className="p-5 sm:p-6 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-sm space-y-3.5"
            data-tour="dashboard-today"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-signal" /> Agenda &amp; Séances ({todayEvents.length})
              </h3>
              <Link href="/calendar" className="text-xs text-signal font-semibold hover:underline flex items-center gap-0.5">
                Calendrier <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {todayEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-400 bg-canvas dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800">
                <p>Aucune séance planifiée aujourd&apos;hui.</p>
                <Link href="/calendar" className="mt-2 inline-block text-signal font-bold hover:underline">
                  + Planifier une séance
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {todayEvents.map((event) => {
                  const color = event.activity?.color ?? "#1E3A5F";
                  const textColor = getContrastTextColor(color);
                  const start = DateTime.fromISO(event.starts_at, { zone: timezone }).toFormat("HH:mm");
                  const end = DateTime.fromISO(event.ends_at, { zone: timezone }).toFormat("HH:mm");

                  return (
                    <li key={event.id}>
                      <Link
                        href={`/calendar/${event.id}`}
                        className="flex items-center justify-between p-3 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 text-xs hover:border-ink-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-bold shadow-2xs shrink-0"
                            style={{ backgroundColor: color, color: textColor }}
                          >
                            {start}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-ink-950 dark:text-white truncate">{event.title}</div>
                            <div className="text-[10px] text-ink-500">
                              {start} – {end}
                              {event.activity?.name ? ` • ${event.activity.name}` : ""}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-ink-500 shrink-0 ml-2">
                          {eventStatusLabel(event.status)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Tâches du jour & prioritaires */}
          <div
            className="p-5 sm:p-6 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-sm space-y-3.5"
            data-tour="dashboard-urgent-tasks"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-warning" /> Tâches prioritaires ({urgentTasks?.length ?? 0})
              </h3>
              <Link href="/tasks" className="text-xs text-signal font-semibold hover:underline flex items-center gap-0.5">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {(urgentTasks?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-xs text-ink-400 bg-canvas dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800">
                <p>Toutes vos tâches sont à jour pour aujourd&apos;hui.</p>
                <Link href="/tasks/new" className="mt-2 inline-block text-signal font-bold hover:underline">
                  + Nouvelle tâche
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {urgentTasks!.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}/edit`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 text-xs hover:border-ink-300 transition-colors shadow-2xs"
                    >
                      <span className="font-semibold text-ink-950 dark:text-white truncate mr-2">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${TASK_PRIORITY_STYLES[task.priority]}`}>
                        {taskPriorityLabel(task.priority)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* 3. SECTION FINANCES & DÉPENSES PROGRAMMÉES */}
      <section className="space-y-3" aria-labelledby="finances-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gold-dark/10 text-gold-dark">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 id="finances-heading" className="text-sm font-bold uppercase tracking-wider text-ink-800 dark:text-ink-200">
              Finances &amp; Dépenses programmées
            </h2>
          </div>
          <Link
            href="/finances"
            className="text-xs font-semibold text-signal hover:underline flex items-center gap-1"
          >
            Vue financière globale <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Dépenses programmées */}
          <div
            className="p-5 sm:p-6 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-sm space-y-3.5"
            data-tour="dashboard-scheduled-expenses"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Dépenses programmées ({scheduledExpenses?.length ?? 0})
              </h3>
              <Link href="/finances?tab=scheduled" className="text-xs text-signal font-semibold hover:underline flex items-center gap-0.5">
                Gérer <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {(scheduledExpenses?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-xs text-ink-400 bg-canvas dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800">
                <p>Aucune dépense programmée à venir.</p>
                <Link href="/finances?tab=scheduled" className="mt-2 inline-block text-signal font-bold hover:underline">
                  + Programmer une dépense
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {scheduledExpenses!.slice(0, 4).map((exp) => {
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
                        className="flex items-center justify-between p-3 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 text-xs hover:border-ink-300 transition-colors shadow-2xs"
                      >
                        <div>
                          <div className="font-semibold text-ink-950 dark:text-white">{exp.name}</div>
                          <div className="text-[10px] text-ink-500">
                            {exp.category} • Échéance : {exp.next_due_date}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-ink-900 dark:text-white">
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
            )}
          </div>

          {/* Règlements & Encaissements attendus */}
          <div
            className="p-5 sm:p-6 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-sm space-y-3.5"
            data-tour="dashboard-late-income"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-positive" /> Règlements &amp; Encaissements attendus ({lateIncome?.length ?? 0})
              </h3>
              <Link href="/finances?tab=income" className="text-xs text-signal font-semibold hover:underline flex items-center gap-0.5">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {(lateIncome?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-xs text-ink-400 bg-canvas dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800">
                <p>Tous vos encaissements sont à jour pour l&apos;instant.</p>
                <Link href="/finances?tab=income" className="mt-2 inline-block text-signal font-bold hover:underline">
                  + Saisir un revenu
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {lateIncome!.slice(0, 4).map((inc) => {
                  const daysDiff = Math.ceil(
                    DateTime.fromISO(inc.due_date, { zone: timezone })
                      .diff(now.startOf("day"), "days")
                      .days
                  );
                  const isLate = daysDiff < 0;
                  const daysLabel =
                    daysDiff < 0
                      ? `En retard de ${Math.abs(daysDiff)} j`
                      : daysDiff === 0
                      ? "Aujourd'hui"
                      : `Dans ${daysDiff} j`;

                  return (
                    <li key={inc.id}>
                      <Link
                        href="/finances?tab=income"
                        className="flex items-center justify-between p-3 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 text-xs hover:border-ink-300 transition-colors shadow-2xs"
                      >
                        <div>
                          <div className="font-semibold text-ink-950 dark:text-white">{inc.label}</div>
                          <div className="text-[10px] text-ink-500">
                            Échéance : {inc.due_date}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-positive">
                            +{formatAmount(inc.amount, inc.currency)}
                          </div>
                          <div className={`text-[10px] font-bold ${isLate ? "text-danger" : "text-ink-500"}`}>
                            {daysLabel}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* 4. SECTION VOS ACTIVITÉS & MISSIONS (EN DERNIER / BAS DE PAGE) */}
      <section className="space-y-3" aria-labelledby="activities-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-signal/10 text-signal">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 id="activities-heading" className="text-sm font-bold uppercase tracking-wider text-ink-800 dark:text-ink-200">
              Vos activités &amp; missions ({activities?.length ?? 0})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/activities/new"
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-signal text-white hover:bg-signal/90 transition-colors"
            >
              + Nouvelle activité
            </Link>
            <Link
              href="/activities"
              className="text-xs font-semibold text-signal hover:underline flex items-center gap-0.5 ml-1"
            >
              Gérer <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div
          className="p-5 sm:p-6 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-sm space-y-4"
          data-tour="dashboard-activities"
        >
          {(activities?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-xs text-ink-400 bg-canvas dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800">
              <p className="text-sm font-medium text-ink-700 dark:text-ink-300">Aucune activité créée pour le moment.</p>
              <p className="text-xs text-ink-500 mt-1">Configurez vos métiers, missions et taux de rémunération pour activer les rappels.</p>
              <Link href="/activities/new" className="mt-3 inline-block px-4 py-2 rounded-xl bg-signal text-white font-bold hover:bg-signal/90 transition-colors">
                + Créer votre première activité
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activities!.map((activity) => {
                const comp = Array.isArray(activity.activity_compensation)
                  ? activity.activity_compensation[0]
                  : activity.activity_compensation;
                return (
                  <Link
                    key={activity.id}
                    href={`/activities/${activity.id}/edit`}
                    className="flex flex-col justify-between p-4 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 hover:border-signal/50 dark:hover:border-signal/50 transition-all shadow-2xs group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/10"
                          style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink-950 dark:text-white text-xs truncate group-hover:text-signal transition-colors">
                            {activity.name}
                          </div>
                          <div className="text-[10px] text-ink-500">
                            {typeLabel(activity.type)}
                          </div>
                        </div>
                      </div>
                    </div>
                    {comp ? (
                      <div className="mt-3 pt-2.5 border-t border-ink-100/60 dark:border-ink-800/60 flex items-center justify-between text-[11px]">
                        <span className="text-ink-400">Rémunération</span>
                        <span className="font-bold text-ink-900 dark:text-ink-100">
                          {formatAmount(comp.amount, comp.currency)}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 pt-2.5 border-t border-ink-100/60 dark:border-ink-800/60 text-[10px] text-ink-400">
                        Rémunération non définie
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Bouton de messagerie interne flottant en bas à droite */}
      <FloatingMessagesButton
        initialUnreadCount={unreadMessagesCount ?? 0}
        timezone={timezone}
        locale={profile?.locale || "fr"}
      />
    </div>
  );
}
