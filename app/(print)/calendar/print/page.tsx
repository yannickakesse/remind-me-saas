import { DateTime } from "luxon";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureCalendarEvents } from "@/lib/calendar/sync";
import { detectConflicts } from "@/lib/calendar/conflicts";
import { getUserTimezone } from "@/lib/time/timezones";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { PrintableCalendar } from "@/components/calendar/printable-calendar";
import type { CalendarPdfEvent, CalendarPdfActivity } from "@/lib/calendar/pdf-generator";
import type { CalendarEventView } from "@/components/calendar/types";

export const dynamic = "force-dynamic";

export default async function CalendarPrintPage({
  searchParams,
}: {
  searchParams?: { date?: string; orientation?: "landscape" | "portrait" };
}) {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const timezone = getUserTimezone(profile);
  const today = DateTime.now().setZone(timezone);

  const anchorDate =
    searchParams?.date && DateTime.fromISO(searchParams.date).isValid
      ? searchParams.date
      : today.toISODate()!;

  const anchorDt = DateTime.fromISO(anchorDate, { zone: timezone });
  const currentMonthDt = anchorDt.isValid ? anchorDt.startOf("month") : today.startOf("month");

  // Bornes de la grille (semaines complètes débordantes)
  const gridStart = currentMonthDt.startOf("month").startOf("week");
  const gridEnd = currentMonthDt.endOf("month").endOf("week");
  const rangeStartISO = gridStart.toISODate()!;
  const rangeEndISO = gridEnd.toISODate()!;

  const supabase = createClient();
  const userSub = await getUserSubscription(supabase, user.id);

  // Synchronisation des occurrences
  await ensureCalendarEvents(supabase, user.id, rangeStartISO, rangeEndISO, timezone);

  const [
    { data: rawEvents },
    { data: rawScheduled },
    { data: rawActivities },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, activity_id, schedule_id, title, starts_at, ends_at, status, is_exception, original_starts_at, notes, activities(color, name)")
      .eq("user_id", user.id)
      .gte("starts_at", gridStart.toUTC().toISO()!)
      .lte("starts_at", gridEnd.toUTC().toISO()!)
      .order("starts_at", { ascending: true }),
    supabase
      .from("scheduled_expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("next_due_date", rangeStartISO)
      .lte("next_due_date", rangeEndISO)
      .neq("status", "cancelled"),
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const regularEvents: CalendarEventView[] = (rawEvents ?? []).map((e) => ({
    ...e,
    activity: Array.isArray(e.activities) ? e.activities[0] ?? null : e.activities,
  }));

  const conflictIds = detectConflicts(regularEvents);

  const regularPdfEvents: CalendarPdfEvent[] = regularEvents.map((e) => ({
    id: e.id,
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    status: e.status,
    activityName: e.activity?.name || "Général",
    activityColor: e.activity?.color || "#3B82F6",
    is_scheduled_expense: false,
    notes: e.notes,
    hasConflict: conflictIds.has(e.id),
  }));

  const scheduledPdfEvents: CalendarPdfEvent[] = (rawScheduled ?? []).map((sc) => {
    const dt = DateTime.fromISO(sc.next_due_date, { zone: timezone }).set({ hour: 9, minute: 0 });
    return {
      id: `scheduled-${sc.id}`,
      title: `${sc.name} (${sc.amount} ${sc.currency})`,
      starts_at: dt.toUTC().toISO()!,
      ends_at: dt.plus({ hours: 1 }).toUTC().toISO()!,
      status: sc.status === "paid" ? "completed" : "planned",
      activityName: "Dépense programmée",
      activityColor: "#D97706",
      is_scheduled_expense: true,
      amount: sc.amount,
      currency: sc.currency,
      notes: sc.notes,
      hasConflict: false,
    };
  });

  const allEvents = [...regularPdfEvents, ...scheduledPdfEvents].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const activities: CalendarPdfActivity[] = (rawActivities ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color || "#3B82F6",
  }));

  const docHash = Math.abs(
    user.id.split("-").reduce((acc, part) => acc + parseInt(part, 16) || 0, 0)
  ).toString(36).toUpperCase().padStart(4, "0");

  const documentRef = `RM-CAL-${currentMonthDt.toFormat("yyyyMM")}-${docHash}`;

  return (
    <PrintableCalendar
      user={{
        fullName: profile?.full_name ?? null,
        email: user.email,
        planName: userSub.entitlements.planName,
      }}
      period={{
        monthLabel: currentMonthDt.setLocale("fr").toFormat("LLLL yyyy"),
        anchorDate,
        generatedAtFormatted: today.setLocale("fr").toFormat("dd/MM/yyyy HH:mm"),
        documentRef,
        timezone,
      }}
      events={allEvents}
      activities={activities}
      initialOrientation={searchParams?.orientation || "landscape"}
    />
  );
}
