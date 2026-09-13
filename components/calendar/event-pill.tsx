import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
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
  const color = event.is_scheduled_expense ? "#D97706" : (event.activity?.color ?? "#1E3A5F");
  const statusStyle = event.is_scheduled_expense
    ? "border-warning/50 bg-warning-soft text-ink-950 font-medium"
    : (EVENT_STATUS_STYLES[event.status] ?? "border-ink-300 text-ink-950");

  const href = event.is_scheduled_expense ? "/finances?tab=scheduled" : `/calendar/${event.id}`;

  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-1.5 truncate rounded-md border px-2 py-1 text-xs hover:brightness-95 transition-all ${statusStyle} ${
        hasConflict ? "ring-1 ring-danger" : ""
      }`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      title={
        hasConflict
          ? `Conflit d'horaire — ${event.title}`
          : event.title
      }
    >
      {!event.is_scheduled_expense && (
        <span className="shrink-0 font-medium">{start.toFormat("HH:mm")}</span>
      )}
      <span className="truncate">{event.title}</span>
      {hasConflict ? <AlertTriangle className="h-3 w-3 shrink-0 text-danger" /> : null}
    </Link>
  );
}
