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
  if (!user) return null; // route déjà protégée par le layout (app)

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timezone = profile?.timezone ?? "UTC";

  const view: CalendarView = isCalendarView(searchParams.view) ? searchParams.view : "month";
  const anchorDate = searchParams.date ?? todayISODate(timezone);

  const { start, end } = resolveViewRange(view, anchorDate, timezone);

  // Génération paresseuse : matérialise les occurrences manquantes pour la
  // période effectivement consultée avant de lire les événements.
  await ensureCalendarEvents(supabase, user.id, start.toISODate()!, end.toISODate()!, timezone);

  const { data: rawEvents } = await supabase
    .from("calendar_events")
    .select(
      "id, activity_id, schedule_id, title, starts_at, ends_at, status, is_exception, original_starts_at, notes, activities(color, name)"
    )
    .eq("user_id", user.id)
    .gte("starts_at", start.toUTC().toISO()!)
    .lte("starts_at", end.toUTC().toISO()!)
    .order("starts_at", { ascending: true });

  const events: CalendarEventView[] = (rawEvents ?? []).map((e) => ({
    ...e,
    activity: Array.isArray(e.activities) ? e.activities[0] ?? null : e.activities,
  }));

  const conflictIds = detectConflicts(events);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-950">Calendrier</h1>
        <p className="text-ink-500">
          Généré automatiquement à partir des horaires de vos activités actives.
        </p>
      </div>

      <CalendarToolbar view={view} anchorDate={anchorDate} timezone={timezone} />

      {view === "month" ? (
        <MonthView anchorDate={anchorDate} timezone={timezone} events={events} conflictIds={conflictIds} />
      ) : null}
      {view === "week" ? (
        <WeekView weekStart={start} timezone={timezone} events={events} conflictIds={conflictIds} />
      ) : null}
      {view === "day" ? (
        <DayView day={DateTime.fromISO(anchorDate, { zone: timezone })} timezone={timezone} events={events} conflictIds={conflictIds} />
      ) : null}
      {view === "agenda" ? (
        <AgendaView start={start} end={end} timezone={timezone} events={events} conflictIds={conflictIds} />
      ) : null}
    </div>
  );
}
