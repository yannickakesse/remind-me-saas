import { z } from "zod";
import type { CalendarEventStatus } from "@/types/database";

export const EVENT_STATUSES: { value: CalendarEventStatus; label: string }[] = [
  { value: "planned", label: "Prévu" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminé" },
  { value: "cancelled", label: "Annulé" },
  { value: "missed", label: "Manqué" },
  { value: "postponed", label: "Reporté" },
];

export function eventStatusLabel(status: string): string {
  return EVENT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

// Classes Tailwind par statut (bordure + texte), cohérentes avec la palette
// signal/positive/warning/danger du design system.
export const EVENT_STATUS_STYLES: Record<string, string> = {
  planned: "border-ink-300 text-ink-950",
  in_progress: "border-signal text-signal",
  completed: "border-positive text-positive",
  cancelled: "border-ink-300 text-ink-500 line-through opacity-60",
  missed: "border-danger text-danger",
  postponed: "border-warning text-warning",
};

/**
 * Calcule une couleur de texte à fort contraste (blanc ou noir/encre sombre)
 * en fonction de la luminance de la couleur de fond de l'activité.
 */
export function getContrastTextColor(hexColor?: string | null): string {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
}

export const rescheduleSchema = z.object({
  newStartsAt: z.string().min(1, "Choisissez une nouvelle date et heure."),
});

export const manualEventSchema = z.object({
  activityId: z.string().uuid("Choisissez une activité."),
  title: z.string().min(1, "Le titre est requis."),
  startsAt: z.string().min(1, "L'heure de début est requise."),
  endsAt: z.string().min(1, "L'heure de fin est requise."),
  notes: z.string().optional(),
});
