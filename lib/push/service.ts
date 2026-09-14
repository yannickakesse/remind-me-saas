import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { dispatchWebPush } from "./webpush";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    notificationId?: string;
    category?: string;
    entityId?: string;
  };
}

export interface SendPushOptions {
  userId: string;
  title: string;
  body: string;
  link?: string;
  category?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface PushProviderResult {
  success: boolean;
  deliveredCount: number;
  simulated?: boolean;
  error?: string;
}

/**
 * Service de distribution des notifications Web Push & Mobile.
 * Gère l'envoi direct vers les endpoints des navigateurs (Chrome, Safari iOS/macOS, Firefox, Edge)
 * enregistrés par l'utilisateur avec gestion VAPID RFC8292 et auditabilité.
 */
export async function sendNotificationPush(
  options: SendPushOptions,
  supabase: SupabaseClient<Database>
): Promise<PushProviderResult> {
  const { userId, title, body, link, category, idempotencyKey } = options;

  // 1. Vérification d'idempotence
  if (idempotencyKey) {
    const { data: existingLog } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      return { success: true, deliveredCount: 0 };
    }
  }

  try {
    const pushResult = await dispatchWebPush(supabase, userId, {
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: {
        url: link || "/notifications",
        category,
      },
    });

    // Enregistrement du log de distribution uniquement si des appareils sont concernés
    if (pushResult.total > 0) {
      await supabase.from("notification_logs").insert({
        user_id: userId,
        channel: "push",
        recipient: `${pushResult.successful}/${pushResult.total} device(s)`,
        template: category || "general",
        delivery_status: pushResult.successful > 0 ? "sent" : "failed",
        idempotency_key: idempotencyKey || null,
        error_message: pushResult.failed > 0 ? `${pushResult.failed} push failure(s)` : null,
      });
    }

    return {
      success: pushResult.successful > 0 || pushResult.total === 0,
      deliveredCount: pushResult.successful,
    };
  } catch (err: any) {
    console.error("[PushService] Dispatch error:", err);
    await supabase.from("notification_logs").insert({
      user_id: userId,
      channel: "push",
      recipient: "devices",
      template: category || "general",
      delivery_status: "failed",
      idempotency_key: idempotencyKey || null,
      error_message: err.message,
    });
    return { success: false, deliveredCount: 0, error: err.message };
  }
}

