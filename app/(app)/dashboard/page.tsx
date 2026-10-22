import Link from "next/link";
import { cookies } from "next/headers";
import { DateTime } from "luxon";
import {
  TrendingUp,
  Clock,
  Briefcase,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatAmount } from "@/lib/finances/format";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { AttentionRequired } from "@/components/dashboard/attention-required";
import { TodayFocus } from "@/components/dashboard/today-focus";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { ensureNotifications } from "@/lib/notifications/sync";
import { getUserTimezone } from "@/lib/time/timezones";
import { typeLabel } from "@/lib/validation/activities";
import { FloatingMessagesButton } from "@/components/dashboard/floating-messages-button";
import { t } from "@/lib/i18n/format";
import type { SupportedLocale } from "@/lib/i18n/types";
import type { Notification } from "@/types/database";

export default async function DashboardPage() {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const cookieStore = cookies();
  const locale =
    (cookieStore.get("NEXT_LOCALE")?.value as SupportedLocale) ||
    (profile?.locale as SupportedLocale) ||
    "fr";

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

  const net = incomeReceived - expensesPaid;
  const hasActivities = (activities?.length ?? 0) > 0;

  const checklistItems = [
    { label: "Créer votre première activité", done: hasActivities, href: "/activities/new" },
    { label: "Configurer votre profil", done: !!profile?.full_name, href: "/settings" },
  ];
  const onboardingComplete = checklistItems.every((item) => item.done);

  return (
    <div className="relative isolate min-h-full w-full space-y-5 sm:space-y-6 max-w-7xl mx-auto min-w-0">
      {/* A. EN-TÊTE COMPACT & PERSONNALISÉ */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sm:p-6 shadow-xs">
        <DashboardHeader userName={profile?.full_name} timezone={timezone} />
      </div>

      {!onboardingComplete ? (
        <div data-tour="dashboard-onboarding">
          <OnboardingChecklist items={checklistItems} />
        </div>
      ) : null}

      {/* B. ALERTES & ATTENTION REQUISE (Immédiatement visible si paiements ou charges en attente) */}
      {attentionNotifications && attentionNotifications.length > 0 ? (
        <div data-tour="dashboard-attention">
          <AttentionRequired notifications={attentionNotifications as Notification[]} />
        </div>
      ) : null}

      {/* C. GRILLE PRINCIPALE RESPONSIVE (Asymétrique Desktop 8+4 & Mobile 1 colonne naturelle) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* 1. FOCUS DE LA JOURNÉE : Séances & Tâches prioritaires (Desktop 8 cols, Mobile premier bloc) */}
        <div className="lg:col-span-8 order-1">
          <TodayFocus
            todayEvents={todayEvents}
            urgentTasks={(urgentTasks ?? []) as any}
            timezone={timezone}
            locale={locale}
            todayIso={todayIso}
          />
        </div>

        {/* 2. SYNTHÈSE FINANCIÈRE DU MOIS (Desktop 4 cols à droite, Mobile juste après la journée) */}
        <div className="lg:col-span-4 order-2">
          <DashboardKpis
            incomeExpected={incomeExpected}
            incomeReceived={incomeReceived}
            expensesPaid={expensesPaid}
            net={net}
            currency={currency}
          />
        </div>

        {/* 3. DÉPENSES PROGRAMMÉES (Desktop 6 cols, Mobile order-3) */}
        <div className="lg:col-span-6 order-3" data-tour="dashboard-scheduled-expenses">
          <div className="p-4 sm:p-5 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{t("dashboard.scheduled_expenses_title", locale)}</span>
                <span className="text-ink-400 font-normal">({scheduledExpenses?.length ?? 0})</span>
              </h3>
              <Link
                href="/finances?tab=scheduled"
                className="text-xs text-signal font-semibold hover:underline flex items-center gap-0.5"
              >
                {t("dashboard.manage", locale)} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {(scheduledExpenses?.length ?? 0) === 0 ? (
              <div className="p-5 text-center text-xs text-ink-400 bg-canvas dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800">
                <p>{t("finances.scheduled_empty", locale)}</p>
                <Link
                  href="/finances?tab=scheduled"
                  className="mt-2 inline-block text-signal font-bold hover:underline"
                >
                  + {t("finances.add_expense", locale)}
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
                  const isLate = daysDiff < 0;
                  const isToday = daysDiff === 0;

                  const daysLabel = isLate
                    ? locale === "fr"
                      ? `En retard de ${Math.abs(daysDiff)} j`
                      : `${Math.abs(daysDiff)} d overdue`
                    : isToday
                    ? t("calendar.today_btn", locale)
                    : locale === "fr"
                    ? `Dans ${daysDiff} j`
                    : `In ${daysDiff} d`;

                  return (
                    <li key={exp.id}>
                      <Link
                        href="/finances?tab=scheduled"
                        className="flex items-center justify-between p-3 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 text-xs hover:border-ink-300 dark:hover:border-ink-700 transition-colors shadow-2xs group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                            {exp.name}
                          </div>
                          <div className="text-[10px] text-ink-500">
                            {exp.category} • Échéance : {exp.next_due_date}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-ink-900 dark:text-white">
                            {formatAmount(exp.amount, exp.currency)}
                          </div>
                          <div
                            className={`text-[10px] font-bold ${
                              isLate || isToday ? "text-danger" : "text-ink-500"
                            }`}
                          >
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

        {/* 4. RÈGLEMENTS & ENCAISSEMENTS ATTENDUS (Desktop 6 cols, Mobile order-4) */}
        <div className="lg:col-span-6 order-4" data-tour="dashboard-late-income">
          <div className="p-4 sm:p-5 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-positive" />
                <span>Encaissements attendus</span>
                <span className="text-ink-400 font-normal">({lateIncome?.length ?? 0})</span>
              </h3>
              <Link
                href="/finances?tab=income"
                className="text-xs text-signal font-semibold hover:underline flex items-center gap-0.5"
              >
                {t("dashboard.see_all", locale)} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {(lateIncome?.length ?? 0) === 0 ? (
              <div className="p-5 text-center text-xs text-ink-400 bg-canvas dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800">
                <p>Tous vos encaissements sont à jour pour l&apos;instant.</p>
                <Link
                  href="/finances?tab=income"
                  className="mt-2 inline-block text-signal font-bold hover:underline"
                >
                  + {t("finances.add_income", locale)}
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
                  const isToday = daysDiff === 0;

                  const daysLabel = isLate
                    ? locale === "fr"
                      ? `En retard de ${Math.abs(daysDiff)} j`
                      : `${Math.abs(daysDiff)} d overdue`
                    : isToday
                    ? t("calendar.today_btn", locale)
                    : locale === "fr"
                    ? `Dans ${daysDiff} j`
                    : `In ${daysDiff} d`;

                  return (
                    <li key={inc.id}>
                      <Link
                        href="/finances?tab=income"
                        className="flex items-center justify-between p-3 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 text-xs hover:border-ink-300 dark:hover:border-ink-700 transition-colors shadow-2xs group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                            {inc.label}
                          </div>
                          <div className="text-[10px] text-ink-500">
                            Échéance : {inc.due_date}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-positive">
                            +{formatAmount(inc.amount, inc.currency)}
                          </div>
                          <div
                            className={`text-[10px] font-bold ${
                              isLate ? "text-danger" : "text-ink-500"
                            }`}
                          >
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

        {/* 5. VOS ACTIVITÉS & MISSIONS (Pleine largeur 12 cols, en bas du dashboard) */}
        <div className="lg:col-span-12 order-5" data-tour="dashboard-activities">
          <section className="space-y-3" aria-labelledby="activities-heading">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-signal/10 text-signal">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <h2
                  id="activities-heading"
                  className="text-xs font-bold uppercase tracking-wider text-ink-800 dark:text-ink-200"
                >
                  {t("nav.activities", locale)} ({activities?.length ?? 0})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/activities/new"
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-signal text-white hover:bg-signal/90 transition-colors shadow-2xs"
                >
                  + {t("activities.add_btn", locale)}
                </Link>
                <Link
                  href="/activities"
                  className="text-xs font-semibold text-signal hover:underline flex items-center gap-0.5 ml-1"
                >
                  {t("dashboard.manage", locale)} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-2xs">
              {(activities?.length ?? 0) === 0 ? (
                <div className="p-6 text-center text-xs text-ink-400 bg-canvas dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800">
                  <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
                    {t("activities.empty_title", locale)}
                  </p>
                  <p className="text-xs text-ink-500 mt-1">{t("activities.empty_desc", locale)}</p>
                  <Link
                    href="/activities/new"
                    className="mt-3 inline-block px-4 py-2 rounded-xl bg-signal text-white font-bold hover:bg-signal/90 transition-colors"
                  >
                    + {t("activities.add_btn", locale)}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activities!.map((activity) => {
                    const comp = Array.isArray(activity.activity_compensation)
                      ? activity.activity_compensation[0]
                      : activity.activity_compensation;
                    const compensationLabel =
                      locale === "fr" ? "Rémunération" : "Compensation";
                    const noCompLabel =
                      locale === "fr"
                        ? "Rémunération non définie"
                        : "No compensation set";

                    return (
                      <Link
                        key={activity.id}
                        href={`/activities/${activity.id}/edit`}
                        className="flex flex-col justify-between p-4 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 hover:border-signal/50 dark:hover:border-signal/50 transition-all shadow-2xs group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/10"
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
                            <span className="text-ink-400">{compensationLabel}</span>
                            <span className="font-mono font-bold text-ink-900 dark:text-ink-100">
                              {formatAmount(comp.amount, comp.currency)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-3 pt-2.5 border-t border-ink-100/60 dark:border-ink-800/60 text-[10px] text-ink-400">
                            {noCompLabel}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Bouton de messagerie interne flottant en bas à droite */}
      <FloatingMessagesButton
        initialUnreadCount={unreadMessagesCount ?? 0}
        timezone={timezone}
        locale={locale}
      />
    </div>
  );
}
