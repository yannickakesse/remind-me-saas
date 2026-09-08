import { z } from "zod";
import type { TaskPriority, TaskStatus } from "@/types/database";

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminée" },
  { value: "cancelled", label: "Annulée" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
];

export function taskStatusLabel(status: string): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function taskPriorityLabel(priority: string): string {
  return TASK_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
}

// Classes Tailwind par priorité (pastille + texte), cohérentes avec la
// palette signal/positive/warning/danger du design system.
export const TASK_PRIORITY_STYLES: Record<string, string> = {
  low: "border-ink-300 text-ink-500",
  medium: "border-signal text-signal",
  high: "border-warning text-warning",
  urgent: "border-danger text-danger",
};

export const taskFormSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  activityId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.string().optional().or(z.literal("")),
  dueTime: z.string().optional().or(z.literal("")),
  reminderMinutesBefore: z
    .union([z.coerce.number().int().min(0), z.literal("")])
    .optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
