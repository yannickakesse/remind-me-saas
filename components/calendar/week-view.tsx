import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
import { EVENT_STATUS_STYLES } from "@/lib/validation/calendar";
import { HOUR_HEIGHT_PX, TIMELINE_HEIGHT_PX, TIMELINE_HOURS, timelinePosition } from "@/lib/calendar/timeline";
import type { CalendarEventView } from "./types";

export function WeekView({
  weekStart,
  timezone,
  events,
  conflictIds,
}: {
  weekStart: DateTime;
  timezone: string;
  events: CalendarEventView[];
  conflictIds: Set<string>;
}) {
  const days = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }));
  const today = DateTime.now().setZone(timezone).toISODate();

  const eventsByDay = new Map<string, CalendarEventView[]>();
  for (const event of events) {
    const iso = DateTime.fromISO(event.starts_at, { zone: timezone }).toISODate()!;
    if (!eventsByDay.has(iso)) eventsByDay.set(iso, []);
    eventsByDay.get(iso)!.push(event);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-100 bg-canvas-raised">
      <div className="flex border-b border-ink-100">
        <div className="w-14 shrink-0" />
        {days.map((day) => {
          const iso = day.toISODate()!;
          return (
            <Link
              key={iso}
              href={`/calendar?view=day&date=${iso}`}
              className={`flex-1 border-l border-ink-100 px-2 py-2 text-center text-xs font-medium ${
                iso === today ? "bg-signal-soft text-signal" : "text-ink-700"
              }`}
            >
              <span className="capitalize">{day.setLocale("fr").toFormat("ccc d")}</span>
            </Link>
          );
        })}
      </div>
      <div className="flex">
        <div className="w-14 shrink-0 border-r border-ink-100">
          {TIMELINE_HOURS.map((hour) => (
            <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="border-b border-ink-100 pr-2 text-right text-xs text-ink-500">
              <span className="relative -top-2">{String(hour).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>
        {days.map((day) => {
          const iso = day.toISODate()!;
          const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

          return (
            <div key={iso} className="relative flex-1 border-l border-ink-100" style={{ height: TIMELINE_HEIGHT_PX }}>
              {TIMELINE_HOURS.map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="border-b border-ink-100" />
              ))}
              {dayEvents.map((event) => {
                const { topPx, heightPx } = timelinePosition(event.starts_at, event.ends_at, timezone);
                const hasConflict = conflictIds.has(event.id);
                const color = event.activity?.color ?? "#1E3A5F";

                return (
                  <Link
                    key={event.id}
                    href={`/calendar/${event.id}`}
                    style={{ top: topPx, height: heightPx, borderLeftColor: color, borderLeftWidth: 3 }}
                    className={`absolute left-1 right-1 overflow-hidden rounded border bg-canvas-raised px-1 py-0.5 text-[11px] leading-tight hover:brightness-95 flex items-center justify-between ${
                      EVENT_STATUS_STYLES[event.status] ?? "border-ink-300"
                    } ${hasConflict ? "ring-1 ring-danger" : ""}`}
                  >
                    <span className="truncate">{event.title}</span>
                    {hasConflict ? <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-danger ml-0.5" /> : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
