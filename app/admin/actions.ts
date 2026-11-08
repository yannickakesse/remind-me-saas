"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFounder, loadFounderMetrics } from "@/lib/admin/founder-metrics";
import { buildFounderDigest } from "@/lib/admin/founder-digest";
import { notifyAdmin, sendFounderMessage } from "@/lib/admin/notifier";
import { getAppUrl } from "@/lib/auth/url";

async function requireFounder() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isFounder(user.email)) throw new Error("Accès réservé au fondateur.");
  return user;
}

/** Envoie une alerte de test sur les canaux configurés (Telegram, Discord, e-mail). */
export async function sendFounderTestAlert(): Promise<{ ok: boolean; message: string }> {
  try {
    const user = await requireFounder();
    const r = await notifyAdmin({ type: "test_alert", email: user.email ?? "—" });
    const channels = [r.telegram && "Telegram", r.discord && "Discord", r.email && "e-mail"].filter(Boolean);
    return channels.length
      ? { ok: true, message: `Alerte de test envoyée : ${channels.join(", ")}.` }
      : { ok: false, message: "Aucun canal n'a répondu : vérifiez TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ou RESEND_API_KEY sur Vercel." };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Envoi impossible." };
  }
}

/** Envoie immédiatement le résumé quotidien (le même que celui de 7 h). */
export async function sendFounderDigestNow(): Promise<{ ok: boolean; message: string }> {
  try {
    await requireFounder();
    const metrics = await loadFounderMetrics(createAdminClient());
    const digest = buildFounderDigest(metrics, Date.now(), getAppUrl());
    const r = await sendFounderMessage(digest);
    const channels = [r.telegram && "Telegram", r.email && "e-mail"].filter(Boolean);
    return channels.length
      ? { ok: true, message: `Résumé envoyé : ${channels.join(", ")}.` }
      : { ok: false, message: "Aucun canal n'a répondu : vérifiez la configuration Telegram ou e-mail sur Vercel." };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Envoi impossible." };
  }
}
