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
      <div className="rounded-3xl border border-dashed border-ink-200 dark:border-ink-800 bg-canvas-raised/60 dark:bg-slate-900/60 p-8 sm:p-12 text-center space-y-3">
        <p className="font-bold text-sm text-ink-950 dark:text-white">
          Aucun événement sur cette période
        </p>
        <p className="text-xs text-ink-500 max-w-sm mx-auto">
          Vos séances d&apos;activités et vos échéances programmées apparaissent ici automatiquement dès qu&apos;elles sont planifiées.
        </p>
        <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
          <Link
            href="/activities/new"
            className="px-3.5 py-2 rounded-xl bg-signal text-white text-xs font-bold shadow-xs hover:bg-signal-dark transition-all"
          >
            + Nouvelle activité
          </Link>
          <Link
            href="/calendar"
            className="px-3.5 py-2 rounded-xl border border-ink-300 dark:border-ink-700 text-ink-700 dark:text-ink-300 text-xs font-semibold hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          >
            Revenir à aujourd&apos;hui
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {daysWithEvents.map((day) => {
        const iso = day.toISODate()!;
        const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) =>
          a.starts_at.localeCompare(b.starts_at)
        );
        const isToday = iso === today;

        return (
          <div key={iso} className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span
                className={`text-xs font-bold uppercase tracking-wider capitalize ${
                  isToday ? "text-signal" : "text-ink-700 dark:text-ink-300"
                }`}
              >
                {day.setLocale("fr").toFormat("cccc d MMMM yyyy")}
              </span>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-signal text-white shadow-2xs">
                  Aujourd&apos;hui
                </span>
              )}
            </div>

            <ul className="flex flex-col gap-2">
              {dayEvents.map((event) => {
                const startTime = DateTime.fromISO(event.starts_at, { zone: timezone });
                const endTime = DateTime.fromISO(event.ends_at, { zone: timezone });
                const hasConflict = conflictIds.has(event.id);
                const color = event.is_scheduled_expense
                  ? "#D97706"
                  : event.activity?.color ?? "#1E3A5F";
                const textColor = getContrastTextColor(color);

                return (
                  <li key={event.id}>
                    <Link
                      href={`/calendar/${event.id}`}
                      className={`flex items-center justify-between rounded-2xl border bg-canvas-raised/98 dark:bg-slate-900/98 p-3.5 sm:p-4 shadow-2xs transition-all hover:border-signal/50 dark:hover:border-signal/50 group ${
                        hasConflict
                          ? "ring-2 ring-danger ring-offset-1 border-danger/50"
                          : "border-ink-200/90 dark:border-ink-800/90"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl font-mono font-bold shadow-2xs text-[11px]"
                          style={{ backgroundColor: color, color: textColor }}
                        >
                          <span>{startTime.toFormat("HH:mm")}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-xs sm:text-sm text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                              {event.title}
                            </p>
                            {hasConflict ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs shrink-0">
                                <AlertTriangle className="h-3 w-3" />
                                Conflit
                              </span>
                            ) : null}
                            {event.is_scheduled_expense && (
                              <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                                Dépense programmée
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-500 mt-0.5 truncate">
                            {startTime.toFormat("HH:mm")} – {endTime.toFormat("HH:mm")}
                            {event.activity?.name ? ` • ${event.activity.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-ink-100 dark:bg-ink-800 px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-ink-700 dark:text-ink-300 shrink-0">
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
