import { z } from "zod";

export const profileFormSchema = z.object({
  fullName: z.string().min(2, "Nom trop court"),
  countryCode: z.string().length(2, "Sélectionnez un pays"),
  currencyCode: z.string().length(3, "Sélectionnez une devise"),
  timezone: z.string().min(1, "Sélectionnez un fuseau horaire"),
  locale: z.enum(["fr", "en"]),
  weekStart: z.coerce.number().int().min(0).max(6),
  timeFormat: z.enum(["12h", "24h"]),
});
export type ProfileFormInput = z.infer<typeof profileFormSchema>;

export const passwordChangeSchema = z
  .object({
    newPassword: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// §59 du prompt maître — types de notification actuellement générés
// (lib/notifications/sync.ts). Toutes activées par défaut ; l'absence
// d'une clé dans notif_prefs équivaut à "activée" (voir isNotificationEnabled).
export const NOTIFICATION_PREF_KEYS = ["task_reminder", "task_overdue", "finance_overdue"] as const;
export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];

export const notifPrefsSchema = z.object({
  task_reminder: z.boolean(),
  task_overdue: z.boolean(),
  finance_overdue: z.boolean(),
});
export type NotifPrefsInput = z.infer<typeof notifPrefsSchema>;

/** Une préférence non définie (jamais enregistrée) est considérée activée par défaut. */
export function isNotificationEnabled(
  prefs: Record<string, unknown> | null | undefined,
  kind: NotificationPrefKey
): boolean {
  const value = prefs?.[kind];
  return typeof value === "boolean" ? value : true;
}
