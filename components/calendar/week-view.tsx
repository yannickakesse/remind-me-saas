import { getServerLocale } from "@/lib/i18n/server";
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
    <div className="overflow-x-auto rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-2xs">
      <div className="min-w-[640px]">
        <div className="flex border-b border-ink-200/80 dark:border-ink-800 bg-canvas dark:bg-ink-950">
          <div className="w-14 shrink-0 sticky left-0 z-30 bg-canvas dark:bg-ink-950" />
          {days.map((day) => {
            const iso = day.toISODate()!;
            return (
              <Link
                key={iso}
                href={`/calendar?view=day&date=${iso}`}
                className={`flex-1 border-l border-ink-200/80 dark:border-ink-800 px-2 py-2.5 text-center text-xs font-semibold ${
                  iso === today ? "bg-signal-soft text-signal" : "text-ink-700 dark:text-ink-300"
                }`}
              >
                <span className="capitalize">{day.setLocale(getServerLocale()).toFormat("ccc d")}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex py-3">
          <div className="w-14 shrink-0 sticky left-0 z-30 bg-canvas-raised dark:bg-slate-900">
            {TIMELINE_HOURS.map((hour) => (
              <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="relative">
                <span className="absolute right-2 top-0 -translate-y-1/2 text-[11px] font-medium tabular-nums text-ink-500 dark:text-ink-400">
                  {String(hour).padStart(2, "0")}:00
                </span>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-medium tabular-nums text-ink-400/80">:30</span>
              </div>
            ))}
          </div>
          {days.map((day) => {
            const iso = day.toISODate()!;
            const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

            return (
              <div key={iso} className="relative flex-1 border-l border-ink-200/80 dark:border-ink-800" style={{ height: TIMELINE_HEIGHT_PX }}>
                {TIMELINE_HOURS.map((hour) => (
                  <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="border-t border-ink-200/70 dark:border-ink-800/70">
                  {/* Repère de la demi-heure (ex. 07:30) */}
                  <div className="h-1/2 border-b border-dashed border-ink-200/60 dark:border-ink-800/60" />
                </div>
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
                      className={`absolute left-1 right-1 overflow-hidden rounded-lg px-1.5 py-1 text-[11px] font-semibold leading-tight shadow-xs transition-all hover:scale-[1.01] hover:brightness-110 flex items-start justify-between gap-0.5 ${
                        isCancelled ? "opacity-50 line-through" : ""
                      } ${hasConflict ? "ring-2 ring-danger ring-offset-1 z-20" : "z-10"}`}
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-[10px] opacity-80">
                          {DateTime.fromISO(event.starts_at, { zone: timezone }).toFormat("HH:mm")}
                        </span>
                        <span className="block truncate">{event.title}</span>
                      </span>
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
