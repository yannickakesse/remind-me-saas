export type SupportedLocale = "en" | "fr" | "es" | "de" | "pt";

export interface LocaleDefinition {
  code: SupportedLocale;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleDefinition[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
];

export type TranslationKey =
  // Navigation & General
  | "nav.notifications"
  | "nav.dashboard"
  | "nav.activities"
  | "nav.calendar"
  | "nav.tasks"
  | "nav.finances"
  | "nav.clients"
  | "nav.reports"
  | "nav.settings"
  // Attention required
  | "attention.title"
  | "attention.subtitle"
  | "attention.all_clear"
  | "attention.overdue_payment"
  | "attention.due_expense"
  | "attention.urgent_task"
  | "attention.upcoming_activity"
  | "attention.conflit_alert"
  // Activity notifications
  | "notif.activity_upcoming.title"
  | "notif.activity_upcoming.body"
  | "notif.activity_reminder.title"
  | "notif.activity_reminder.body"
  | "notif.activity_conflict.title"
  | "notif.activity_conflict.body"
  // Payment notifications
  | "notif.payment_upcoming.title"
  | "notif.payment_upcoming.body"
  | "notif.payment_due_today.title"
  | "notif.payment_due_today.body"
  | "notif.payment_overdue.title"
  | "notif.payment_overdue.body"
  | "notif.payment_received.title"
  | "notif.payment_received.body"
  // Expense notifications
  | "notif.expense_upcoming.title"
  | "notif.expense_upcoming.body"
  | "notif.expense_due_today.title"
  | "notif.expense_due_today.body"
  | "notif.expense_overdue.title"
  | "notif.expense_overdue.body"
  | "notif.expense_warning.title"
  | "notif.expense_warning.body"
  // Task notifications
  | "notif.task_due_today.title"
  | "notif.task_due_today.body"
  | "notif.task_due_soon.title"
  | "notif.task_due_soon.body"
  | "notif.task_overdue.title"
  | "notif.task_overdue.body"
  // Summaries
  | "notif.daily_summary.title"
  | "notif.daily_summary.body"
  | "notif.weekly_summary.title"
  | "notif.weekly_summary.body"
  // Actions & Controls
  | "actions.mark_received"
  | "actions.mark_paid"
  | "actions.snooze"
  | "actions.snooze_1d"
  | "actions.snooze_3d"
  | "actions.snooze_1w"
  | "actions.view_item"
  | "actions.dismiss"
  | "actions.mark_all_read"
  | "actions.filter_all"
  | "actions.filter_unread"
  | "actions.filter_overdue"
  | "actions.empty_title"
  | "actions.empty_desc";
