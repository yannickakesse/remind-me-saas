import { DateTime } from "luxon";

// Plage horaire visible par défaut dans les vues jour/semaine — couvre la
// grande majorité des horaires d'activité tout en gardant une grille lisible.
// Un événement en dehors de cette plage est simplement rogné visuellement au
// bord (rare en pratique pour des horaires de travail).
export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 22;
export const HOUR_HEIGHT_PX = 48;

export const TIMELINE_HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
  (_, i) => TIMELINE_START_HOUR + i
);

export const TIMELINE_HEIGHT_PX = TIMELINE_HOURS.length * HOUR_HEIGHT_PX;

/** Position verticale (px depuis le haut de la grille) et hauteur (px) d'un événement. */
export function timelinePosition(
  startsAt: string,
  endsAt: string,
  timezone: string
): { topPx: number; heightPx: number } {
  const start = DateTime.fromISO(startsAt, { zone: timezone });
  const end = DateTime.fromISO(endsAt, { zone: timezone });

  const gridStartMinutes = TIMELINE_START_HOUR * 60;
  const gridEndMinutes = TIMELINE_END_HOUR * 60;

  const startMinutes = Math.min(
    Math.max(start.hour * 60 + start.minute, gridStartMinutes),
    gridEndMinutes
  );
  const endMinutes = Math.min(
    Math.max(end.hour * 60 + end.minute, gridStartMinutes),
    gridEndMinutes
  );

  const topPx = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT_PX;
  const heightPx = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT_PX, 18);

  return { topPx, heightPx };
}
