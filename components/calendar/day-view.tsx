import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
import { EVENT_STATUS_STYLES, eventStatusLabel } from "@/lib/validation/calendar";
import { HOUR_HEIGHT_PX, TIMELINE_HEIGHT_PX, TIMELINE_HOURS, timelinePosition } from "@/lib/calendar/timeline";
import type { CalendarEventView } from "./types";

export function DayView({
  day,
  timezone,
  events,
  conflictIds,
}: {
  day: DateTime;
  timezone: string;
  events: CalendarEventView[];
  conflictIds: Set<string>;
}) {
  const iso = day.toISODate()!;
  const dayEvents = events
    .filter((e) => DateTime.fromISO(e.starts_at, { zone: timezone }).toISODate() === iso)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <div className="rounded-lg border border-ink-100 bg-canvas-raised">
      <div className="flex">
        <div className="w-14 shrink-0 border-r border-ink-100">
          {TIMELINE_HOURS.map((hour) => (
            <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="border-b border-ink-100 pr-2 text-right text-xs text-ink-500">
              <span className="relative -top-2">{String(hour).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>
        <div className="relative flex-1" style={{ height: TIMELINE_HEIGHT_PX }}>
          {TIMELINE_HOURS.map((hour) => (
            <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="border-b border-ink-100" />
          ))}
          {dayEvents.length === 0 ? (
            <p className="absolute inset-x-0 top-8 text-center text-sm text-ink-500">
              Aucun événement ce jour-là.
            </p>
          ) : null}
          {dayEvents.map((event) => {
            const { topPx, heightPx } = timelinePosition(event.starts_at, event.ends_at, timezone);
            const hasConflict = conflictIds.has(event.id);
            const color = event.activity?.color ?? "#1E3A5F";
            const start = DateTime.fromISO(event.starts_at, { zone: timezone });
            const end = DateTime.fromISO(event.ends_at, { zone: timezone });

            return (
              <Link
                key={event.id}
                href={`/calendar/${event.id}`}
                style={{ top: topPx, height: heightPx, borderLeftColor: color, borderLeftWidth: 3 }}
                className={`absolute left-2 right-2 overflow-hidden rounded-md border bg-canvas-raised px-2 py-1 text-xs shadow-sm hover:brightness-95 ${
                  EVENT_STATUS_STYLES[event.status] ?? "border-ink-300"
                } ${hasConflict ? "ring-1 ring-danger" : ""}`}
              >
                <div className="flex items-center gap-1">
                  <p className="truncate font-medium">
                    {start.toFormat("HH:mm")}–{end.toFormat("HH:mm")} · {event.title}
                  </p>
                  {hasConflict ? <AlertTriangle className="h-3 w-3 shrink-0 text-danger" /> : null}
                </div>
                <p className="truncate text-ink-500">{eventStatusLabel(event.status)}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
