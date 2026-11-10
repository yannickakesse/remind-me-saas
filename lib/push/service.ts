import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { dispatchWebPush, type WebPushPayload } from "./webpush";

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
  /** Étiquette système : une par rappel (un même rappel relancé remplace sa version précédente). */
  tag?: string;
  /** Libellés des boutons de la notification, dans la langue de l'utilisateur. */
  actionLabels?: { read: string; listen: string; open: string };
}

export interface PushProviderResult {
  success: boolean;
  deliveredCount: number;
  /** true si au moins un appareil était inscrit mais qu'aucun n'a reçu le push (relance possible). */
  failed?: boolean;
  simulated?: boolean;
  error?: string;
}

function buildPayload(options: SendPushOptions): WebPushPayload {
  return {
    title: options.title,
    body: options.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: {
      id: (options.metadata?.notificationId as string) || (options.metadata?.id as string) || undefined,
      url: options.link || "/notifications",
      category: options.category,
      voice_text: (options.metadata?.voice_text as string) || null,
      voice_reminder_enabled: options.metadata?.voice_reminder_enabled !== false,
      // Type et délai du rappel : choix de la phrase de la voix standard
      kind: (options.metadata?.kind as string) || null,
      days: typeof options.metadata?.days === "number" ? options.metadata.days : null,
      tag: options.tag || null,
      action_labels: options.actionLabels || null,
    },
  };
}

/**
 * Service de distribution des notifications Web Push & Mobile.
 * Gère l'envoi direct vers les endpoints des navigateurs (Chrome, Safari iOS/macOS, Firefox, Edge)
 * enregistrés par l'utilisateur avec gestion VAPID RFC8292 et auditabilité.
 *
 * Idempotence : une clé déjà présente dans notification_logs n'est jamais renvoyée ici.
 * Les envois échoués sont relancés par retryFailedPushes (3 tentatives max, sans doublon).
 */
export async function sendNotificationPush(
  options: SendPushOptions,
  supabase: SupabaseClient<Database>
): Promise<PushProviderResult> {
  const { userId, category, idempotencyKey } = options;

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
    const pushResult = await dispatchWebPush(supabase, userId, buildPayload(options));
    const failed = pushResult.total > 0 && pushResult.successful === 0;

    // Enregistrement du log de distribution uniquement si des appareils sont concernés
    if (pushResult.total > 0) {
      await supabase.from("notification_logs").insert({
        user_id: userId,
        channel: "push",
        recipient: `${pushResult.successful}/${pushResult.total} device(s)`,
        template: category || "general",
        delivery_status: failed ? "failed" : "sent",
        idempotency_key: idempotencyKey || null,
        error_message:
          pushResult.failed > 0
            ? `${pushResult.failed} push failure(s)${pushResult.lastError ? ` — ${pushResult.lastError}` : ""}`
            : null,
      });
    }

    return {
      success: pushResult.successful > 0 || pushResult.total === 0,
      deliveredCount: pushResult.successful,
      failed,
    };
  } catch (err: any) {
    console.error("[PushService] Dispatch error:", err?.message);
    await supabase.from("notification_logs").insert({
      user_id: userId,
      channel: "push",
      recipient: "devices",
      template: category || "general",
      delivery_status: "failed",
      idempotency_key: idempotencyKey || null,
      error_message: err?.message,
    });
    return { success: false, deliveredCount: 0, failed: true, error: err?.message };
  }
}

/**
 * Relance des push échoués récents (cron serveur uniquement, client service_role).
 * - fenêtre : 30 minutes après le premier essai (au-delà, le rappel n'a plus de sens) ;
 * - 3 tentatives au maximum, compteur dans notification_logs.attempts ;
 * - une seule ligne de journal par rappel : aucun doublon possible.
 */
export async function retryFailedPushes(
  supabaseAdmin: SupabaseClient<Database>,
  { maxAttempts = 3, windowMinutes = 30, limit = 50 } = {}
): Promise<{ retried: number; recovered: number }> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { data: logs, error } = await (supabaseAdmin as any)
    .from("notification_logs")
    .select("id, user_id, idempotency_key, attempts, template")
    .eq("channel", "push")
    .eq("delivery_status", "failed")
    .lt("attempts", maxAttempts)
    .gte("created_at", since)
    .like("idempotency_key", "push:%")
    .limit(limit);

  // Colonne « attempts » absente tant que la migration 0025 n'est pas appliquée : pas de relance.
  if (error || !logs?.length) return { retried: 0, recovered: 0 };

  let retried = 0;
  let recovered = 0;
  for (const log of logs as Array<{ id: string; user_id: string; idempotency_key: string; attempts: number; template: string }>) {
    const notifKey = log.idempotency_key.slice("push:".length);
    const { data: notif } = await supabaseAdmin
      .from("notifications")
      .select("title, body, link, category, kind, metadata, status, read_at")
      .eq("user_id", log.user_id)
      .eq("idempotency_key", notifKey)
      .maybeSingle();

    const attempts = (log.attempts ?? 1) + 1;
    // Rappel déjà lu ou traité : inutile de relancer
    if (!notif || notif.read_at || ["resolved", "dismissed", "actioned"].includes(String(notif.status))) {
      await (supabaseAdmin as any)
        .from("notification_logs")
        .update({ attempts: maxAttempts, updated_at: new Date().toISOString(), error_message: "Relance annulée : rappel déjà traité" })
        .eq("id", log.id);
      continue;
    }

    retried++;
    let ok = false;
    let recipient = "devices";
    let errorMessage: string | null = null;
    try {
      const res = await dispatchWebPush(
        supabaseAdmin,
        log.user_id,
        buildPayload({
          userId: log.user_id,
          title: notif.title,
          body: notif.body ?? "",
          link: notif.link ?? undefined,
          category: notif.category ?? undefined,
          metadata: { ...((notif.metadata as Record<string, any>) || {}), kind: notif.kind },
        })
      );
      ok = res.successful > 0;
      recipient = `${res.successful}/${res.total} device(s)`;
      if (!ok)
        errorMessage =
          res.total === 0
            ? "Aucun appareil inscrit"
            : `${res.failed} push failure(s)${res.lastError ? ` — ${res.lastError}` : ""}`;
    } catch (err: any) {
      errorMessage = err?.message || "Erreur d'envoi";
    }
    if (ok) recovered++;

    await (supabaseAdmin as any)
      .from("notification_logs")
      .update({
        attempts,
        delivery_status: ok ? "sent" : "failed",
        recipient,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", log.id);
  }
  return { retried, recovered };
}
