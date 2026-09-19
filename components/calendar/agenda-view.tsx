import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
import { EVENT_STATUS_STYLES, eventStatusLabel, getContrastTextColor } from "@/lib/validation/calendar";
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
                const color = event.is_scheduled_expense ? "#D97706" : (event.activity?.color ?? "#1E3A5F");
                const textColor = getContrastTextColor(color);

                return (
                  <li key={event.id}>
                    <Link
                      href={`/calendar/${event.id}`}
                      className={`flex items-center justify-between rounded-xl border bg-canvas-raised p-3.5 shadow-xs transition-all hover:border-ink-300 hover:shadow-sm ${
                        hasConflict ? "ring-2 ring-danger ring-offset-1" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg font-bold shadow-xs text-xs"
                          style={{ backgroundColor: color, color: textColor }}
                        >
                          <span>{startTime.toFormat("HH:mm")}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-ink-950">{event.title}</p>
                            {hasConflict ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-danger px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                                <AlertTriangle className="h-3 w-3" />
                                Conflit d'horaire
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-ink-500 mt-0.5">
                            {startTime.toFormat("HH:mm")} – {endTime.toFormat("HH:mm")}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">
                        {eventStatusLabel(event.status)}
                      </span>
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
