import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureCalendarEvents } from "@/lib/calendar/sync";
import { detectConflicts } from "@/lib/calendar/conflicts";
import { isCalendarView, resolveViewRange, todayISODate, type CalendarView } from "@/lib/calendar/view-range";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { AgendaView } from "@/components/calendar/agenda-view";
import type { CalendarEventView } from "@/components/calendar/types";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; date?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timezone = profile?.timezone ?? "UTC";

  const view: CalendarView = isCalendarView(searchParams.view) ? searchParams.view : "month";
  const anchorDate = searchParams.date ?? todayISODate(timezone);

  const { start, end } = resolveViewRange(view, anchorDate, timezone);

  // Synchronisation des activités du calendrier
  await ensureCalendarEvents(supabase, user.id, start.toISODate()!, end.toISODate()!, timezone);

  // Requêtes parallélisées pour événements et dépenses programmées
  const [{ data: rawEvents }, { data: rawScheduled }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "id, activity_id, schedule_id, title, starts_at, ends_at, status, is_exception, original_starts_at, notes, activities(color, name)"
      )
      .eq("user_id", user.id)
      .gte("starts_at", start.toUTC().toISO()!)
      .lte("starts_at", end.toUTC().toISO()!)
      .order("starts_at", { ascending: true }),
    supabase
      .from("scheduled_expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("next_due_date", start.toISODate()!)
      .lte("next_due_date", end.toISODate()!)
      .neq("status", "cancelled"),
  ]);

  const regularEvents: CalendarEventView[] = (rawEvents ?? []).map((e) => ({
    ...e,
    activity: Array.isArray(e.activities) ? e.activities[0] ?? null : e.activities,
  }));

  const scheduledEvents: CalendarEventView[] = (rawScheduled ?? []).map((sc) => {
    const dt = DateTime.fromISO(sc.next_due_date, { zone: timezone }).set({ hour: 9, minute: 0 });
    return {
      id: `scheduled-${sc.id}`,
      activity_id: sc.activity_id ?? "",
      schedule_id: null,
      title: `💸 ${sc.name} (${sc.amount} ${sc.currency})`,
      starts_at: dt.toUTC().toISO()!,
      ends_at: dt.plus({ hours: 1 }).toUTC().toISO()!,
      status: (sc.status === "paid" ? "completed" : "planned") as any,
      is_exception: false,
      original_starts_at: null,
      notes: sc.notes,
      activity: { color: "#D97706", name: "Dépense programmée" },
      is_scheduled_expense: true,
      amount: sc.amount,
      currency: sc.currency,
    };
  });

  const allEvents = [...regularEvents, ...scheduledEvents].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const conflictIds = detectConflicts(regularEvents);

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 truncate">
          Calendrier & Planning
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Vos séances d'activités et vos échéances financières programmées.
        </p>
      </div>

      <CalendarToolbar view={view} anchorDate={anchorDate} timezone={timezone} />

      {view === "month" ? (
        <MonthView anchorDate={anchorDate} timezone={timezone} events={allEvents} conflictIds={conflictIds} />
      ) : null}
      {view === "week" ? (
        <WeekView weekStart={start} timezone={timezone} events={allEvents} conflictIds={conflictIds} />
      ) : null}
      {view === "day" ? (
        <DayView day={DateTime.fromISO(anchorDate, { zone: timezone })} timezone={timezone} events={allEvents} conflictIds={conflictIds} />
      ) : null}
      {view === "agenda" ? (
        <AgendaView start={start} end={end} timezone={timezone} events={allEvents} conflictIds={conflictIds} />
      ) : null}
    </div>
  );
}
