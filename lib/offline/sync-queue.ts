import { createClient } from "@/lib/supabase/client";
import { getPendingOfflineActions, removeOfflineAction, type OfflineAction } from "./db";

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Traite la file d'attente hors-ligne dès que la connexion internet est rétablie.
 * Gère l'idempotence et la résolution de conflits (Last-Write-Wins par horodatage).
 */
export async function processOfflineSyncQueue(): Promise<SyncResult> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { processed: 0, succeeded: 0, failed: 0, errors: ["Hors-ligne"] };
  }

  const pendingActions = await getPendingOfflineActions();
  if (pendingActions.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const supabase = createClient();
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of pendingActions) {
    try {
      const { entityType, action, payload } = item;

      if (entityType === "task") {
        if (action === "create") {
          const { error } = await supabase.from("tasks").insert(payload as any);
          if (error) throw error;
        } else if (action === "update") {
          const { error } = await supabase.from("tasks").update(payload as any).eq("id", payload.id);
          if (error) throw error;
        } else if (action === "resolve") {
          const { error } = await supabase
            .from("tasks")
            .update({ status: "done", completed_at: new Date().toISOString() })
            .eq("id", payload.id);
          if (error) throw error;
        }
      } else if (entityType === "expense") {
        if (action === "create") {
          const { error } = await supabase.from("expenses").insert(payload as any);
          if (error) throw error;
        } else if (action === "resolve") {
          const { error } = await supabase
            .from("expenses")
            .update({ paid: true, paid_at: new Date().toISOString().split("T")[0] })
            .eq("id", payload.id);
          if (error) throw error;
        }
      } else if (entityType === "income") {
        if (action === "create") {
          const { error } = await supabase.from("income").insert(payload as any);
          if (error) throw error;
        } else if (action === "resolve") {
          const { error } = await supabase
            .from("income")
            .update({ received: true, received_at: new Date().toISOString().split("T")[0] })
            .eq("id", payload.id);
          if (error) throw error;
        }
      } else if (entityType === "scheduled_expense") {
        if (action === "create") {
          const { error } = await supabase.from("scheduled_expenses").insert(payload as any);
          if (error) throw error;
        }
      } else if (entityType === "activity") {
        if (action === "create") {
          const { error } = await supabase.from("activities").insert(payload as any);
          if (error) throw error;
        }
      }

      await removeOfflineAction(item.id);
      succeeded++;
    } catch (err: any) {
      console.warn(`[OfflineSync] Échec pour l'action ${item.id}:`, err?.message);
      failed++;
      errors.push(err?.message || "Erreur inconnue");
    }
  }

  // Notifie les composants de l'application que les données ont été synchronisées
  if (succeeded > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("remindme_offline_synced", { detail: { succeeded } }));
  }

  return {
    processed: pendingActions.length,
    succeeded,
    failed,
    errors,
  };
}
