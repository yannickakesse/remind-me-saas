import type { NotificationKind } from "@/types/database";

export function notificationKindLabel(kind: NotificationKind): string {
  switch (kind) {
    case "task_reminder":
      return "Rappel de tâche";
    case "task_overdue":
      return "Tâche en retard";
    case "finance_overdue":
      return "Échéance en retard";
  }
}

export const NOTIFICATION_KIND_STYLES: Record<NotificationKind, string> = {
  task_reminder: "border-signal text-signal",
  task_overdue: "border-danger text-danger",
  finance_overdue: "border-danger text-danger",
};
