import { z } from "zod";

export const SUPPORTED_LOCALE_CODES = [
  "fr",
  "en",
  "es",
  "de",
  "pt",
  "it",
  "nl",
  "ru",
  "zh",
  "ja",
  "ar",
  "hi",
] as const;

export const profileFormSchema = z.object({
  fullName: z.string().min(2, "Nom trop court"),
  countryCode: z.string().length(2, "Sélectionnez un pays"),
  currencyCode: z.string().length(3, "Sélectionnez une devise"),
  timezone: z.string().min(1, "Sélectionnez un fuseau horaire"),
  locale: z.enum(SUPPORTED_LOCALE_CODES),
  weekStart: z.coerce.number().int().min(0).max(6),
  timeFormat: z.enum(["12h", "24h"]),
});
export type ProfileFormInput = z.infer<typeof profileFormSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "Le mot de passe doit comporter au moins 8 caractères"),
    confirmPassword: z.string().min(1, "Veuillez confirmer votre mot de passe"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const NOTIFICATION_PREF_KEYS = [
  "task_reminder",
  "task_overdue",
  "finance_overdue",
  "email_enabled",
  "in_app_enabled",
  "push_enabled",
  "activity_reminders",
  "payment_reminders",
  "expense_reminders",
  "finance_reminders",
  "task_reminders",
  "conflict_alerts",
] as const;
export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];

export const notifPrefsSchema = z.object({
  email_enabled: z.boolean().default(true),
  in_app_enabled: z.boolean().default(true),
  push_enabled: z.boolean().default(false),
  activity_reminders: z.boolean().default(true),
  payment_reminders: z.boolean().default(true),
  expense_reminders: z.boolean().default(true),
  finance_reminders: z.boolean().default(true),
  task_reminders: z.boolean().default(true),
  conflict_alerts: z.boolean().default(true),
  quiet_hours_enabled: z.boolean().default(false),
  quiet_hours_start: z.string().default("22:00"),
  quiet_hours_end: z.string().default("08:00"),
  preferred_locale: z.enum(SUPPORTED_LOCALE_CODES).default("fr"),
  voice_reminders: z.boolean().default(true),
  voice_type: z.enum(["system", "female", "male"]).default("system"),
  voice_language: z.enum(["fr", "en", "es", "de", "pt"]).default("fr"),
  repeat_voice: z.coerce.number().int().min(0).max(2).default(0),
  voice_category_activities: z.boolean().default(true),
  voice_category_tasks: z.boolean().default(true),
  voice_category_finances: z.boolean().default(true),
  voice_category_briefings: z.boolean().default(true),
  voice_hide_financial_amounts: z.boolean().default(false),
  voice_include_user_name: z.boolean().default(true),
  custom_voice_reminder_text: z.string().max(500).default(""),
  voice_playback_rate: z.coerce.number().min(0.7).max(1.5).default(1.0),
  first_reminder_minutes: z.coerce.number().int().min(5).max(1440).default(60),
  second_reminder_minutes: z.coerce.number().int().min(1).max(60).default(10),
  daily_summary_time: z.string().default("20:00"),
});
export type NotifPrefsInput = z.infer<typeof notifPrefsSchema>;

/** Une préférence non définie (jamais enregistrée) est considérée activée par défaut. */
export function isNotificationEnabled(
  prefs: Record<string, unknown> | null | undefined,
  kind: string
): boolean {
  const value = prefs?.[kind];
  return typeof value === "boolean" ? value : true;
}
