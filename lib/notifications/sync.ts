import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { evaluateSmartReminders } from "./engine";

/**
 * Point d'entrée pour la synchronisation paresseuse des notifications
 * intelligentes et de l'évaluation des rappels d'activités, paiements et dépenses.
 */
export async function ensureNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone = "UTC"
): Promise<void> {
  await evaluateSmartReminders(supabase, userId, timezone);
}
