import Link from "next/link";
import { DateTime } from "luxon";
import { EVENT_STATUS_STYLES } from "@/lib/validation/calendar";
import type { CalendarEventView } from "./types";

export function EventPill({
  event,
  timezone,
  hasConflict,
}: {
  event: CalendarEventView;
  timezone: string;
  hasConflict?: boolean;
}) {
  const start = DateTime.fromISO(event.starts_at, { zone: timezone });
  const color = event.activity?.color ?? "#1E3A5F";
  const statusStyle = EVENT_STATUS_STYLES[event.status] ?? "border-ink-300 text-ink-950";

  return (
    <Link
      href={`/calendar/${event.id}`}
      className={`flex w-full items-center gap-1.5 truncate rounded-md border bg-canvas-raised px-2 py-1 text-xs hover:brightness-95 ${statusStyle} ${
        hasConflict ? "ring-1 ring-danger" : ""
      }`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      title={
        hasConflict
          ? `Conflit d'horaire — ${event.title}`
          : event.title
      }
    >
      <span className="shrink-0 font-medium">{start.toFormat("HH:mm")}</span>
      <span className="truncate">{event.title}</span>
      {hasConflict ? <span aria-hidden className="shrink-0 text-danger">⚠</span> : null}
    </Link>
  );
}
