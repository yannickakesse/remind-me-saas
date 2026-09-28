export type SupportedLocale =
  | "fr"
  | "en"
  | "es"
  | "de"
  | "pt"
  | "it"
  | "nl"
  | "ru"
  | "zh"
  | "ja"
  | "ar"
  | "hi";

export interface LocaleDefinition {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  flag: string;
  direction?: "ltr" | "rtl";
}

export const SUPPORTED_LOCALES: LocaleDefinition[] = [
  { code: "fr", label: "Français", nativeLabel: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", nativeLabel: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", nativeLabel: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", nativeLabel: "Português", flag: "🇧🇷" },
  { code: "it", label: "Italiano", nativeLabel: "Italiano", flag: "🇮🇹" },
  { code: "nl", label: "Nederlands", nativeLabel: "Nederlands", flag: "🇳🇱" },
  { code: "ru", label: "Русский", nativeLabel: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", nativeLabel: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", nativeLabel: "日本語", flag: "🇯🇵" },
  { code: "ar", label: "العربية", nativeLabel: "العربية", flag: "🇸🇦", direction: "rtl" },
  { code: "hi", label: "हिन्दी", nativeLabel: "हिन्दी", flag: "🇮🇳" },
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
  | "nav.login"
  | "nav.register"
  | "nav.start"
  | "nav.how_it_works"
  | "nav.features"
  | "nav.pricing"
  | "nav.faq"
  | "nav.language"
  | "nav.menu"
  | "nav.home"
  | "nav.new_task"
  | "nav.overview"
  | "nav.income"
  | "nav.expenses"
  | "nav.scheduled_expenses"
  | "nav.savings"
  | "nav.budgets"
  | "nav.general"
  | "nav.my_account"

  // Attention required / Dashboard
  | "attention.title"
  | "attention.subtitle"
  | "attention.all_clear"
  | "attention.overdue_payment"
  | "attention.due_expense"
  | "attention.urgent_task"
  | "attention.upcoming_activity"
  | "attention.conflit_alert"
  | "attention.manage_all"
  | "attention.confirm_session"
  | "attention.dismiss"
  | "attention.critical"
  | "attention.urgent"
  | "attention.info"

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

  // Summaries & Routine
  | "notif.daily_summary.title"
  | "notif.daily_summary.body"
  | "notif.weekly_summary.title"
  | "notif.weekly_summary.body"
  | "notif.morning_briefing.title"
  | "notif.morning_briefing.body"
  | "notif.evening_checkin.title"
  | "notif.evening_checkin.body"

  // Actions & Controls
  | "actions.mark_received"
  | "actions.mark_paid"
  | "actions.mark_done"
  | "actions.mark_completed"
  | "actions.snooze"
  | "actions.snooze_1d"
  | "actions.snooze_3d"
  | "actions.snooze_1w"
  | "actions.view_item"
  | "actions.dismiss"
  | "actions.delete"
  | "actions.mark_all_read"
  | "actions.filter_all"
  | "actions.filter_active"
  | "actions.filter_unread"
  | "actions.filter_tasks"
  | "actions.filter_finances"
  | "actions.filter_history"
  | "actions.filter_overdue"
  | "actions.empty_title"
  | "actions.empty_desc"
  | "actions.search_placeholder"
  | "actions.search_language"
  | "actions.select_language_title"
  | "actions.select_language_subtitle"
  | "actions.language_footer_note"
  | "actions.close"
  // Landing Page Hero
  | "hero.social_proof"
  | "hero.title_line1"
  | "hero.title_line2"
  | "hero.subtitle"
  | "hero.cta_start"
  | "hero.cta_demo"
  | "hero.trust_no_card"
  | "hero.trust_2_min"
  | "hero.trust_rls"

  // Landing Page Navbar & Sections
  | "landing.nav_features"
  | "landing.nav_how_it_works"
  | "landing.nav_personas"
  | "landing.nav_pricing"
  | "landing.nav_faq"
  | "landing.nav_login"
  | "landing.nav_start"
  | "landing.nav_dashboard"

  // Dashboard Page & KPIs
  | "dashboard.welcome"
  | "dashboard.overview_title"
  | "dashboard.btn_activity"
  | "dashboard.btn_task"
  | "dashboard.btn_expense"
  | "dashboard.pending_payments"
  | "dashboard.pending_payments_helper"
  | "dashboard.total_received"
  | "dashboard.total_received_helper"
  | "dashboard.expenses_paid"
  | "dashboard.expenses_paid_helper"
  | "dashboard.net_balance"
  | "dashboard.net_balance_helper"
  | "dashboard.urgent_tasks"
  | "dashboard.scheduled_expenses_title"
  | "dashboard.see_all"
  | "dashboard.manage"
  | "dashboard.today_events"
  | "dashboard.no_events_today"

  // Settings & Theme
  | "settings.language_title"
  | "settings.language_desc"
  | "settings.theme_title"
  | "settings.theme_desc";
