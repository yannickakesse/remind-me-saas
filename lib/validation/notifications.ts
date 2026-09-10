import type { NotificationKind } from "@/types/database";

export function notificationKindLabel(kind: NotificationKind): string {
  switch (kind) {
    case "task_reminder":
      return "Rappel de tâche";
    case "task_overdue":
      return "Tâche en retard";
    case "task_due_today":
      return "Tâche pour aujourd'hui";
    case "finance_overdue":
    case "payment_overdue":
      return "Paiement en retard";
    case "payment_upcoming":
      return "Paiement à venir";
    case "payment_due_today":
      return "Paiement attendu";
    case "expense_due_today":
    case "expense_due":
      return "Dépense à régler";
    case "expense_overdue":
      return "Dépense en retard";
    case "activity_upcoming":
    case "activity_reminder":
      return "Session prévue";
    case "activity_conflict":
      return "Conflit d'agenda";
    default:
      return "Notification";
  }
}

export const NOTIFICATION_KIND_STYLES: Record<string, string> = {
  task_reminder: "border-signal text-signal",
  task_overdue: "border-danger text-danger",
  task_due_today: "border-signal text-signal",
  finance_overdue: "border-danger text-danger",
  payment_overdue: "border-danger text-danger",
  payment_upcoming: "border-signal text-signal",
  payment_due_today: "border-warning text-warning",
  expense_due_today: "border-warning text-warning",
  expense_due: "border-warning text-warning",
  expense_overdue: "border-danger text-danger",
  activity_upcoming: "border-signal text-signal",
  activity_reminder: "border-signal text-signal",
  activity_conflict: "border-danger text-danger",
};
