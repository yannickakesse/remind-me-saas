import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
import { EVENT_STATUS_STYLES, getContrastTextColor } from "@/lib/validation/calendar";
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
    <div className="overflow-x-auto rounded-lg border border-ink-100 bg-canvas-raised shadow-xs">
      <div className="min-w-[680px]">
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
                  const color = event.is_scheduled_expense ? "#D97706" : (event.activity?.color ?? "#1E3A5F");
                  const textColor = getContrastTextColor(color);
                  const isCancelled = event.status === "cancelled";

                  return (
                    <Link
                      key={event.id}
                      href={`/calendar/${event.id}`}
                      style={{
                        top: topPx,
                        height: heightPx,
                        backgroundColor: color,
                        color: textColor,
                        border: "1px solid rgba(0, 0, 0, 0.15)",
                      }}
                      className={`absolute left-1 right-1 overflow-hidden rounded px-1.5 py-0.5 text-[11px] font-semibold leading-tight shadow-xs transition-all hover:scale-[1.01] hover:brightness-110 flex items-center justify-between ${
                        isCancelled ? "opacity-50 line-through" : ""
                      } ${hasConflict ? "ring-2 ring-danger ring-offset-1 z-20" : "z-10"}`}
                    >
                      <span className="truncate">{event.title}</span>
                      {hasConflict ? (
                        <span className="shrink-0 ml-0.5 rounded bg-danger px-0.5 py-0.2 text-[9px] font-bold text-white shadow-xs flex items-center">
                          <AlertTriangle className="h-2.5 w-2.5" />
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
