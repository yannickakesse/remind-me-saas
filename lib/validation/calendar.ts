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
