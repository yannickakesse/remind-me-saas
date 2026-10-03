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
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md border border-ink-200/90 dark:border-ink-800/90 shadow-xs">
      <div className="flex items-center gap-2 max-w-full flex-wrap">
        <Link
          href={`/calendar?view=${view}&date=${prev}`}
          className="rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-950 px-3 py-1.5 text-xs sm:text-sm font-bold text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
          aria-label="Période précédente"
        >
          ←
        </Link>
        <Link
          href={`/calendar?view=${view}&date=${today}`}
          className="rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-950 px-3 py-1.5 text-xs sm:text-sm font-bold text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
        >
          Aujourd&apos;hui
        </Link>
        <Link
          href={`/calendar?view=${view}&date=${next}`}
          className="rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-950 px-3 py-1.5 text-xs sm:text-sm font-bold text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
          aria-label="Période suivante"
        >
          →
        </Link>
        <p className="ml-2 text-sm sm:text-base font-extrabold capitalize text-ink-950 dark:text-white truncate max-w-[200px] sm:max-w-none">{label}</p>
      </div>
      <div className="flex items-center gap-1.5 rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200/90 dark:border-ink-800/90 p-1 max-w-full overflow-x-auto no-scrollbar" data-tour="calendar-views">
        {CALENDAR_VIEWS.map((v) => (
          <Link
            key={v.value}
            href={`/calendar?view=${v.value}&date=${anchorDate}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold shrink-0 whitespace-nowrap transition-all ${
              v.value === view ? "bg-signal text-white shadow-xs" : "text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-950 dark:hover:text-white"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
