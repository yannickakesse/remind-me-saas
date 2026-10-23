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
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Auras lumineuses d'ambiance en arrière-plan */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-signal/10 dark:bg-signal/5 blur-3xl pointer-events-none" />
        <div className="absolute top-2/3 -right-20 w-80 h-80 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />

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
          <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
                    {t("dashboard.scheduled_expenses_title", locale)}
                  </h3>
                  <span className="text-[11px] text-ink-500">
                    {scheduledExpenses?.length ?? 0} charge{scheduledExpenses && scheduledExpenses.length > 1 ? "s" : ""} prévue{scheduledExpenses && scheduledExpenses.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <Link
                href="/finances?tab=scheduled"
                className="text-xs text-signal font-semibold hover:underline flex items-center gap-1 group"
              >
                <span>{t("dashboard.manage", locale)}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {(scheduledExpenses?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-xs text-ink-500 bg-canvas/60 dark:bg-slate-950/40 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 space-y-2">
                <p>{t("finances.scheduled_empty", locale)}</p>
                <Link
                  href="/finances?tab=scheduled"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-signal/10 hover:bg-signal/20 text-signal font-bold transition-colors"
                >
                  + {t("finances.add_expense", locale)}
                </Link>
              </div>
            ) : (
              <ul className="space-y-2.5">
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
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-ink-100/90 dark:border-white/5 bg-canvas dark:bg-slate-950/70 hover:border-amber-400/40 dark:hover:border-amber-400/30 transition-all duration-200 hover:-translate-y-0.5 shadow-2xs group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-xs sm:text-sm text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                            {exp.name}
                          </div>
                          <div className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-1.5">
                            <span className="capitalize">{exp.category}</span>
                            <span>•</span>
                            <span>Échéance : {exp.next_due_date}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-xs sm:text-sm text-ink-950 dark:text-white">
                            {formatAmount(exp.amount, exp.currency)}
                          </div>
                          <div
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                              isLate
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : isToday
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-ink-100 dark:bg-white/5 text-ink-600 dark:text-ink-400"
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
          <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
                    Encaissements attendus
                  </h3>
                  <span className="text-[11px] text-ink-500">
                    {lateIncome?.length ?? 0} facture{lateIncome && lateIncome.length > 1 ? "s" : ""} en attente
                  </span>
                </div>
              </div>
              <Link
                href="/finances?tab=income"
                className="text-xs text-signal font-semibold hover:underline flex items-center gap-1 group"
              >
                <span>{t("dashboard.see_all", locale)}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {(lateIncome?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-xs text-ink-500 bg-canvas/60 dark:bg-slate-950/40 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 space-y-2">
                <p>Tous vos encaissements sont à jour pour l&apos;instant.</p>
                <Link
                  href="/finances?tab=income"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-signal/10 hover:bg-signal/20 text-signal font-bold transition-colors"
                >
                  + {t("finances.add_income", locale)}
                </Link>
              </div>
            ) : (
              <ul className="space-y-2.5">
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
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-ink-100/90 dark:border-white/5 bg-canvas dark:bg-slate-950/70 hover:border-emerald-400/40 dark:hover:border-emerald-400/30 transition-all duration-200 hover:-translate-y-0.5 shadow-2xs group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-xs sm:text-sm text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                            {inc.label}
                          </div>
                          <div className="text-[11px] text-ink-500 mt-0.5">
                            Échéance : {inc.due_date}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                            +{formatAmount(inc.amount, inc.currency)}
                          </div>
                          <div
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                              isLate
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : "bg-ink-100 dark:bg-white/5 text-ink-600 dark:text-ink-400"
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
          <section className="space-y-3.5" aria-labelledby="activities-heading">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-signal/10 text-signal border border-signal/20">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    id="activities-heading"
                    className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white"
                  >
                    {t("nav.activities", locale)} ({activities?.length ?? 0})
                  </h2>
                  <p className="text-[11px] text-ink-500">
                    Vos différentes casquettes et rémunérations associées
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/activities/new"
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-signal text-white hover:bg-signal-dark transition-all duration-150 shadow-2xs hover:shadow-sm"
                >
                  + {t("activities.add_btn", locale)}
                </Link>
                <Link
                  href="/activities"
                  className="text-xs font-semibold text-signal hover:underline flex items-center gap-1 group ml-1"
                >
                  <span>{t("dashboard.manage", locale)}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-6 shadow-xs">
              {(activities?.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-xs text-ink-500 bg-canvas/60 dark:bg-slate-950/40 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 space-y-2">
                  <p className="text-sm font-semibold text-ink-950 dark:text-white">
                    {t("activities.empty_title", locale)}
                  </p>
                  <p className="text-xs text-ink-500">{t("activities.empty_desc", locale)}</p>
                  <Link
                    href="/activities/new"
                    className="mt-3 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-signal text-white font-bold hover:bg-signal-dark transition-colors shadow-2xs"
                  >
                    + {t("activities.add_btn", locale)}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                    const activityColor = activity.color ?? "#E5A91E";

                    return (
                      <Link
                        key={activity.id}
                        href={`/activities/${activity.id}/edit`}
                        className="relative overflow-hidden flex flex-col justify-between p-4 rounded-2xl border border-ink-100/90 dark:border-white/5 bg-canvas dark:bg-slate-950/70 hover:border-signal/50 dark:hover:border-signal/40 transition-all duration-200 hover:-translate-y-1 shadow-2xs hover:shadow-xs group"
                      >
                        {/* Barre d'accentuation supérieure thématique */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1 opacity-70 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: activityColor }}
                        />

                        <div className="flex items-start justify-between gap-2 pt-1">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/20 shadow-2xs"
                              style={{ backgroundColor: activityColor }}
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-ink-950 dark:text-white text-xs sm:text-sm truncate group-hover:text-signal transition-colors">
                                {activity.name}
                              </div>
                              <div className="text-[11px] text-ink-500 capitalize">
                                {typeLabel(activity.type)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {comp ? (
                          <div className="mt-3.5 pt-2.5 border-t border-ink-100/80 dark:border-white/5 flex items-center justify-between text-[11px]">
                            <span className="text-ink-500">{compensationLabel}</span>
                            <span className="font-mono font-bold text-xs text-ink-950 dark:text-white">
                              {formatAmount(comp.amount, comp.currency)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-3.5 pt-2.5 border-t border-ink-100/80 dark:border-white/5 text-[11px] text-ink-400">
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
