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
    <div className="overflow-hidden rounded-lg border border-ink-100">
      <div className="grid grid-cols-7 border-b border-ink-100 bg-canvas-raised">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-500">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const iso = day.toISODate()!;
          const isCurrentMonth = day.month === anchor.month;
          const isToday = iso === today;
          const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          const overflow = dayEvents.length - MAX_VISIBLE_PER_DAY;

          return (
            <div
              key={iso}
              className={`min-h-[110px] border-b border-r border-ink-100 p-1.5 last:border-r-0 ${
                isCurrentMonth ? "bg-canvas-raised" : "bg-canvas"
              }`}
            >
              <Link
                href={`/calendar?view=day&date=${iso}`}
                className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-signal font-semibold text-white"
                    : isCurrentMonth
                      ? "text-ink-950"
                      : "text-ink-300"
                }`}
              >
                {day.day}
              </Link>
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, MAX_VISIBLE_PER_DAY).map((event) => (
                  <EventPill key={event.id} event={event} timezone={timezone} hasConflict={conflictIds.has(event.id)} />
                ))}
                {overflow > 0 ? (
                  <Link
                    href={`/calendar?view=day&date=${iso}`}
                    className="px-1 text-xs font-medium text-signal hover:underline"
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
  );
}
