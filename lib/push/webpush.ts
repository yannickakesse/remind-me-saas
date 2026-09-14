import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Configuration des clés VAPID par défaut pour le développement et la production
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "UUxI8S9E0Lw3EeqPqg0Z7B1WJ3xUvC1E4F2G9H8I7J6";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:support@remindme.io";

// Initialisation globale de web-push
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.debug("[WebPush] Initialisation VAPID:", e);
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    category?: string;
    entityId?: string;
  };
}

export interface SendPushResult {
  total: number;
  successful: number;
  failed: number;
  expiredRemoved: number;
}

/**
 * Envoie une notification Web Push réelle aux appareils enregistrés de l'utilisateur.
 * Gère automatiquement le nettoyage des souscriptions expirées (410 Gone / 404 Not Found).
 */
export async function dispatchWebPush(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: WebPushPayload
): Promise<SendPushResult> {
  const result: SendPushResult = {
    total: 0,
    successful: 0,
    failed: 0,
    expiredRemoved: 0,
  };

  // Récupération des souscriptions actives
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions" as any)
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !subscriptions || subscriptions.length === 0) {
    return result;
  }

  result.total = subscriptions.length;
  const stringifiedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/badge-72x72.png",
    data: payload.data || { url: "/notifications" },
  });

  const sendPromises = subscriptions.map(async (sub: any) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, stringifiedPayload, {
        TTL: 60 * 60 * 24, // 24 heures de rétention sur le serveur push
        urgency: "high",
      });
      result.successful++;
    } catch (err: any) {
      result.failed++;
      console.warn(`[WebPush] Échec d'envoi vers ${sub.endpoint}:`, err?.statusCode || err?.message);

      // Si le service push indique que la souscription n'est plus valide (404 ou 410)
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        result.expiredRemoved++;
        await supabase
          .from("push_subscriptions" as any)
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", sub.id);
      }
    }
  });

  await Promise.all(sendPromises);
  return result;
}
