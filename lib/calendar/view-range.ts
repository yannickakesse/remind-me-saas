import { DateTime } from "luxon";

export type CalendarView = "month" | "week" | "day" | "agenda";

export const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "agenda", label: "Agenda" },
];

const AGENDA_SPAN_DAYS = 14;

export function isCalendarView(value: string | undefined): value is CalendarView {
  return value === "month" || value === "week" || value === "day" || value === "agenda";
}

/** Bornes [start, end] (DateTime, incluses) de la période affichée pour une vue et une date d'ancrage. */
export function resolveViewRange(
  view: CalendarView,
  anchorISODate: string,
  timezone: string
): { start: DateTime; end: DateTime } {
  const anchor = DateTime.fromISO(anchorISODate, { zone: timezone }).startOf("day");

  switch (view) {
    case "day":
      return { start: anchor.startOf("day"), end: anchor.endOf("day") };
    case "week":
      return { start: anchor.startOf("week"), end: anchor.endOf("week") };
    case "agenda":
      return {
        start: anchor.startOf("day"),
        end: anchor.plus({ days: AGENDA_SPAN_DAYS - 1 }).endOf("day"),
      };
    case "month":
    default:
      // On étend aux semaines complètes qui débordent sur les mois voisins,
      // pour que la grille mensuelle affiche des semaines pleines.
      return {
        start: anchor.startOf("month").startOf("week"),
        end: anchor.endOf("month").endOf("week"),
      };
  }
}

/** Nouvelle date d'ancrage (ISO) après un déplacement précédent/suivant, selon la vue active. */
export function shiftAnchor(
  view: CalendarView,
  anchorISODate: string,
  timezone: string,
  direction: 1 | -1
): string {
  const anchor = DateTime.fromISO(anchorISODate, { zone: timezone });
  switch (view) {
    case "day":
      return anchor.plus({ days: direction }).toISODate()!;
    case "week":
      return anchor.plus({ weeks: direction }).toISODate()!;
    case "agenda":
      return anchor.plus({ days: AGENDA_SPAN_DAYS * direction }).toISODate()!;
    case "month":
    default:
      return anchor.plus({ months: direction }).startOf("month").toISODate()!;
  }
}

export function todayISODate(timezone: string): string {
  return DateTime.now().setZone(timezone).toISODate()!;
}
