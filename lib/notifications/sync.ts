import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { triggerProactiveReminders } from "./engine";

/**
 * Point d'entrée pour la synchronisation paresseuse des notifications
 * intelligentes et de l'évaluation des rappels d'activités, paiements et dépenses.
 * Découplé et non-bloquant pour ne jamais ralentir les pages ou les actions.
 */
export async function ensureNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone = "UTC"
): Promise<void> {
  await triggerProactiveReminders(supabase, userId, timezone);
}
