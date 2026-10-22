import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
import { EVENT_STATUS_STYLES, eventStatusLabel, getContrastTextColor } from "@/lib/validation/calendar";
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
    <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-2xs overflow-hidden">
      <div className="flex">
        <div className="w-14 sm:w-16 shrink-0 border-r border-ink-100 dark:border-ink-800 bg-canvas/40 dark:bg-ink-950/40">
          {TIMELINE_HOURS.map((hour) => (
            <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="border-b border-ink-100/70 dark:border-ink-800/70 pr-2 text-right text-xs text-ink-500 font-mono">
              <span className="relative -top-2">{String(hour).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>
        <div className="relative flex-1" style={{ height: TIMELINE_HEIGHT_PX }}>
          {TIMELINE_HOURS.map((hour) => (
            <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="border-b border-ink-100/70 dark:border-ink-800/70" />
          ))}
          {dayEvents.length === 0 ? (
            <div className="absolute inset-x-0 top-12 text-center text-xs text-ink-400">
              <p className="font-semibold">Aucun événement ce jour-là.</p>
              <Link href="/activities/new" className="mt-1 inline-block text-signal font-bold hover:underline">
                + Planifier une séance
              </Link>
            </div>
          ) : null}
          {dayEvents.map((event) => {
            const { topPx, heightPx } = timelinePosition(event.starts_at, event.ends_at, timezone);
            const hasConflict = conflictIds.has(event.id);
            const color = event.is_scheduled_expense ? "#D97706" : (event.activity?.color ?? "#1E3A5F");
            const textColor = getContrastTextColor(color);
            const isCancelled = event.status === "cancelled";
            const start = DateTime.fromISO(event.starts_at, { zone: timezone });
            const end = DateTime.fromISO(event.ends_at, { zone: timezone });

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
                className={`absolute left-2 right-2 overflow-hidden rounded-md px-2.5 py-1.5 text-xs shadow-xs transition-all hover:scale-[1.005] hover:brightness-110 ${
                  isCancelled ? "opacity-50 line-through" : ""
                } ${hasConflict ? "ring-2 ring-danger ring-offset-1 z-20" : "z-10"}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate font-bold">
                    {start.toFormat("HH:mm")}–{end.toFormat("HH:mm")} · {event.title}
                  </p>
                  {hasConflict ? (
                    <span className="shrink-0 flex items-center rounded bg-danger px-1 text-[10px] font-bold text-white shadow-xs">
                      <AlertTriangle className="h-3 w-3 mr-0.5" /> Conflit
                    </span>
                  ) : null}
                </div>
                <p className="truncate opacity-85 text-[11px] font-medium">{eventStatusLabel(event.status)}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
