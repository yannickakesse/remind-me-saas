import Link from "next/link";
import { DateTime } from "luxon";
import { EVENT_STATUS_STYLES, eventStatusLabel } from "@/lib/validation/calendar";
import type { CalendarEventView } from "./types";

export function AgendaView({
  start,
  end,
  timezone,
  events,
  conflictIds,
}: {
  start: DateTime;
  end: DateTime;
  timezone: string;
  events: CalendarEventView[];
  conflictIds: Set<string>;
}) {
  const eventsByDay = new Map<string, CalendarEventView[]>();
  for (const event of events) {
    const iso = DateTime.fromISO(event.starts_at, { zone: timezone }).toISODate()!;
    if (!eventsByDay.has(iso)) eventsByDay.set(iso, []);
    eventsByDay.get(iso)!.push(event);
  }

  const days: DateTime[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }

  const today = DateTime.now().setZone(timezone).toISODate();
  const daysWithEvents = days.filter((d) => (eventsByDay.get(d.toISODate()!) ?? []).length > 0);

  if (daysWithEvents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-300 px-6 py-12 text-center">
        <p className="font-medium text-ink-950">Aucun événement sur cette période</p>
        <p className="text-sm text-ink-500">
          Les événements apparaissent ici automatiquement dès qu'une activité a des horaires.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {daysWithEvents.map((day) => {
        const iso = day.toISODate()!;
        const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

        return (
          <div key={iso}>
            <p className={`mb-2 text-sm font-semibold uppercase tracking-wide ${iso === today ? "text-signal" : "text-ink-500"}`}>
              {day.setLocale("fr").toFormat("cccc d MMMM")}
              {iso === today ? " · aujourd'hui" : ""}
            </p>
            <ul className="flex flex-col gap-2">
              {dayEvents.map((event) => {
                const startTime = DateTime.fromISO(event.starts_at, { zone: timezone });
                const endTime = DateTime.fromISO(event.ends_at, { zone: timezone });
                const hasConflict = conflictIds.has(event.id);
                const color = event.activity?.color ?? "#1E3A5F";

                return (
                  <li key={event.id}>
                    <Link
                      href={`/calendar/${event.id}`}
                      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                      className={`flex items-center justify-between rounded-lg border bg-canvas-raised px-4 py-3 hover:brightness-95 ${
                        EVENT_STATUS_STYLES[event.status] ?? "border-ink-300"
                      } ${hasConflict ? "ring-1 ring-danger" : ""}`}
                    >
                      <div>
                        <p className="font-medium text-ink-950">
                          {event.title}
                          {hasConflict ? <span className="ml-2 text-xs text-danger">⚠ conflit d'horaire</span> : null}
                        </p>
                        <p className="text-sm text-ink-500">
                          {startTime.toFormat("HH:mm")} – {endTime.toFormat("HH:mm")}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-ink-500">{eventStatusLabel(event.status)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
