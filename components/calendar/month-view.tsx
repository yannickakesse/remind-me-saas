import Link from "next/link";
import { DateTime } from "luxon";
import { EventPill } from "./event-pill";
import type { CalendarEventView } from "./types";

const MAX_VISIBLE_PER_DAY = 3;

export function MonthView({
  anchorDate,
  timezone,
  events,
  conflictIds,
}: {
  anchorDate: string;
  timezone: string;
  events: CalendarEventView[];
  conflictIds: Set<string>;
}) {
  const anchor = DateTime.fromISO(anchorDate, { zone: timezone });
  const gridStart = anchor.startOf("month").startOf("week");
  const gridEnd = anchor.endOf("month").endOf("week");
  const today = DateTime.now().setZone(timezone).toISODate();

  const days: DateTime[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }

  const eventsByDay = new Map<string, CalendarEventView[]>();
  for (const event of events) {
    const day = DateTime.fromISO(event.starts_at, { zone: timezone }).toISODate()!;
    if (!eventsByDay.has(day)) eventsByDay.set(day, []);
    eventsByDay.get(day)!.push(event);
  }

  const weekdayLabels = days.slice(0, 7).map((d) => d.setLocale("fr").toFormat("ccc"));

  return (
    <div className="overflow-x-auto rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-sm p-1.5 sm:p-3">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-ink-200/80 dark:border-ink-800/80 bg-canvas/80 dark:bg-ink-950/80 rounded-2xl mb-1">
          {weekdayLabels.map((label) => (
            <div key={label} className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-400">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 rounded-2xl overflow-hidden border border-ink-200/80 dark:border-ink-800/80">
          {days.map((day) => {
            const iso = day.toISODate()!;
            const isCurrentMonth = day.month === anchor.month;
            const isToday = iso === today;
            const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
            const overflow = dayEvents.length - MAX_VISIBLE_PER_DAY;

            return (
              <div
                key={iso}
                className={`min-h-[115px] border-b border-r border-ink-200/70 dark:border-ink-800/70 p-2 last:border-r-0 ${
                  isCurrentMonth ? "bg-canvas-raised dark:bg-slate-900" : "bg-canvas/60 dark:bg-ink-950/60"
                }`}
              >
                <Link
                  href={`/calendar?view=day&date=${iso}`}
                  className={`mb-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-transform hover:scale-110 ${
                    isToday
                      ? "bg-signal font-extrabold text-white shadow-xs"
                      : isCurrentMonth
                        ? "text-ink-950 dark:text-white hover:text-signal"
                        : "text-ink-400 dark:text-ink-600"
                  }`}
                >
                  {day.day}
                </Link>
                <div className="flex flex-col gap-1.5">
                  {dayEvents.slice(0, MAX_VISIBLE_PER_DAY).map((event) => (
                    <EventPill key={event.id} event={event} timezone={timezone} hasConflict={conflictIds.has(event.id)} />
                  ))}
                  {overflow > 0 ? (
                    <Link
                      href={`/calendar?view=day&date=${iso}`}
                      className="px-1 text-xs font-bold text-signal hover:underline"
                    >
                      +{overflow} de plus
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
