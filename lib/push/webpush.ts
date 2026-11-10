import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Configuration des clés VAPID par défaut pour le développement et la production
// .trim() : un espace ou un retour à la ligne collé dans Vercel suffit à casser tous les envois
export const VAPID_PUBLIC_KEY = (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BE8s3t5tTHgVP9A-V5tKLq4vUCcFNU1m8bhDtFgwil3ORODoMl4Jmbo47rhMaTcNemPJb8c588D7oqj6VqYtVBU"
).trim();
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY?.trim();
const VAPID_SUBJECT = (process.env.VAPID_SUBJECT || "mailto:support@remindme.io").trim();

/** Raison pour laquelle aucun push ne peut partir (clés absentes ou invalides), sinon null. */
export let VAPID_CONFIG_ERROR: string | null = null;

// Initialisation globale de web-push (uniquement si les clés sont fournies)
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e: any) {
    VAPID_CONFIG_ERROR = `VAPID invalide : ${e?.message || e}`;
    console.error("[WebPush] Clés VAPID invalides — aucun push ne peut partir :", e?.message || e);
  }
} else {
  VAPID_CONFIG_ERROR = "VAPID absent : NEXT_PUBLIC_VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY manquant";
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    id?: string;
    url?: string;
    category?: string;
    entityId?: string;
    voice_text?: string | null;
    voice_reminder_enabled?: boolean;
    [key: string]: any;
  };
}

export interface SendPushResult {
  total: number;
  successful: number;
  failed: number;
  expiredRemoved: number;
  /** Dernière cause d'échec (code du service push ou message), pour le journal. */
  lastError?: string;
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

  // Récupération des souscriptions réelles de l'utilisateur
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions" as any)
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return result;
  }

  result.total = subscriptions.length;
  if (VAPID_CONFIG_ERROR) {
    result.failed = subscriptions.length;
    result.lastError = VAPID_CONFIG_ERROR;
    return result;
  }
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
      result.lastError = err?.statusCode
        ? `HTTP ${err.statusCode}${err?.body ? ` ${String(err.body).slice(0, 120)}` : ""}`
        : String(err?.message || err).slice(0, 160);
      console.warn(`[WebPush] Échec d'envoi vers ${sub.endpoint}:`, err?.statusCode || err?.message);

      // Si le service push indique que la souscription n'est plus valide (404 ou 410)
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        result.expiredRemoved++;
        await supabase
          .from("push_subscriptions" as any)
          .delete()
          .eq("id", sub.id);
      }
    }
  });

  await Promise.all(sendPromises);
  return result;
}
