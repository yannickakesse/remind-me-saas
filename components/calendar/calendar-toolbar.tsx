import Link from "next/link";
import { DateTime } from "luxon";
import { CALENDAR_VIEWS, shiftAnchor, todayISODate, type CalendarView } from "@/lib/calendar/view-range";

const LABEL_FORMATS: Record<CalendarView, string> = {
  day: "cccc d MMMM yyyy",
  week: "'Semaine du' d MMMM yyyy",
  agenda: "'À partir du' d MMMM yyyy",
  month: "MMMM yyyy",
};

export function CalendarToolbar({
  view,
  anchorDate,
  timezone,
}: {
  view: CalendarView;
  anchorDate: string;
  timezone: string;
}) {
  const prev = shiftAnchor(view, anchorDate, timezone, -1);
  const next = shiftAnchor(view, anchorDate, timezone, 1);
  const today = todayISODate(timezone);

  const label = DateTime.fromISO(anchorDate, { zone: timezone })
    .setLocale("fr")
    .toFormat(LABEL_FORMATS[view]);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 max-w-full flex-wrap">
        <Link
          href={`/calendar?view=${view}&date=${prev}`}
          className="rounded-md border border-ink-300 px-2.5 py-1.5 text-sm text-ink-700 hover:bg-signal-soft"
          aria-label="Période précédente"
        >
          ←
        </Link>
        <Link
          href={`/calendar?view=${view}&date=${today}`}
          className="rounded-md border border-ink-300 px-2.5 py-1.5 text-sm text-ink-700 hover:bg-signal-soft"
        >
          Aujourd&apos;hui
        </Link>
        <Link
          href={`/calendar?view=${view}&date=${next}`}
          className="rounded-md border border-ink-300 px-2.5 py-1.5 text-sm text-ink-700 hover:bg-signal-soft"
          aria-label="Période suivante"
        >
          →
        </Link>
        <p className="ml-1 text-sm font-medium capitalize text-ink-950 truncate max-w-[200px] sm:max-w-none">{label}</p>
      </div>
      <div className="flex items-center gap-1 rounded-md border border-ink-300 p-0.5 max-w-full overflow-x-auto no-scrollbar">
        {CALENDAR_VIEWS.map((v) => (
          <Link
            key={v.value}
            href={`/calendar?view=${v.value}&date=${anchorDate}`}
            className={`rounded px-3 py-1.5 text-sm font-medium shrink-0 whitespace-nowrap ${
              v.value === view ? "bg-signal text-white" : "text-ink-700 hover:bg-signal-soft"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
