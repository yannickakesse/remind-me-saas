import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
import { getContrastTextColor } from "@/lib/validation/calendar";
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
  const textColor = getContrastTextColor(color);
  const isCancelled = event.status === "cancelled";

  const href = event.is_scheduled_expense ? "/finances?tab=scheduled" : `/calendar/${event.id}`;

  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-1.5 truncate rounded-md px-2 py-1 text-xs font-medium shadow-xs transition-all hover:scale-[1.01] hover:brightness-110 ${
        isCancelled ? "opacity-50 line-through" : ""
      } ${hasConflict ? "ring-2 ring-danger ring-offset-1 z-10" : ""}`}
      style={{
        backgroundColor: color,
        color: textColor,
        border: "1px solid rgba(0, 0, 0, 0.12)",
      }}
      title={
        hasConflict
          ? `⚠️ CONFLIT D'HORAIRE — ${event.title}`
          : event.title
      }
    >
      {!event.is_scheduled_expense && (
        <span className="shrink-0 font-bold opacity-90">{start.toFormat("HH:mm")}</span>
      )}
      <span className="truncate">{event.title}</span>
      {hasConflict ? (
        <span className="ml-auto shrink-0 flex items-center justify-center rounded bg-danger px-1 text-[10px] font-bold text-white shadow-xs">
          <AlertTriangle className="h-3 w-3 mr-0.5" /> Conflit
        </span>
      ) : null}
    </Link>
  );
}
