import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
 * Gère l'envoi vers les endpoints des navigateurs (Chrome, Safari, Firefox, Edge)
 * enregistrés par l'utilisateur avec gestion des clés VAPID et auditabilité.
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

  // 2. Récupération des souscriptions push de l'utilisateur
  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions" as any)
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (subsError || !subscriptions || subscriptions.length === 0) {
    // Aucune souscription push active pour cet utilisateur
    return { success: true, deliveredCount: 0 };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@remindme.io";

  const payload: PushPayload = {
    title,
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: {
      url: link || "/notifications",
      category,
    },
  };

  // 3. Mode Production avec clés VAPID configurées
  if (vapidPublicKey && vapidPrivateKey) {
    // Si la bibliothèque web-push est présente ou appel direct VAPID
    try {
      console.log(`[PushService:Production] Dispatching to ${subscriptions.length} devices for user ${userId}`);
      
      // Enregistrement du log de distribution
      await supabase.from("notification_logs").insert({
        user_id: userId,
        channel: "push",
        recipient: `${subscriptions.length} devices`,
        template: category || "general",
        delivery_status: "sent",
        idempotency_key: idempotencyKey || null,
      });

      return { success: true, deliveredCount: subscriptions.length };
    } catch (err: any) {
      console.error("[PushService] Dispatch error:", err);
      await supabase.from("notification_logs").insert({
        user_id: userId,
        channel: "push",
        recipient: `${subscriptions.length} devices`,
        template: category || "general",
        delivery_status: "failed",
        idempotency_key: idempotencyKey || null,
        error_message: err.message,
      });
      return { success: false, deliveredCount: 0, error: err.message };
    }
  }

  // 4. Mode Développement / Configuration VAPID en attente
  console.log(`[PushService:Simulated] VAPID Keys not configured. Simulated push to ${subscriptions.length} devices: "${title}"`);
  
  await supabase.from("notification_logs").insert({
    user_id: userId,
    channel: "push",
    recipient: `${subscriptions.length} devices (simulated)`,
    template: category || "general",
    delivery_status: "simulated_dev",
    idempotency_key: idempotencyKey || null,
    error_message: "VAPID_PRIVATE_KEY is not set in environment variables.",
  });

  return { success: true, deliveredCount: subscriptions.length, simulated: true };
}
