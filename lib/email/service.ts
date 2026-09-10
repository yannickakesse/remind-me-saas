import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SupportedLocale } from "@/types/database";
import { generateEmailHtml, generateEmailText } from "./templates";

export interface SendEmailOptions {
  userId: string;
  recipientEmail: string;
  recipientName: string;
  template: string;
  title: string;
  body: string;
  link: string;
  locale?: SupportedLocale;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface EmailProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Service d'envoi d'e-mails transactionnels avec idempotence et auditabilité.
 */
export async function sendNotificationEmail(
  options: SendEmailOptions,
  supabase?: SupabaseClient<Database>
): Promise<boolean> {
  const {
    userId,
    recipientEmail,
    recipientName,
    template,
    title,
    body,
    link,
    locale = "en",
    idempotencyKey,
  } = options;

  // 1. Vérification d'idempotence via les logs
  if (supabase && idempotencyKey) {
    const { data: existingLog } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      // Déjà traité, pas de renvoi
      return true;
    }
  }

  const html = generateEmailHtml({ recipientName, title, body, link, locale });
  const text = generateEmailText({ recipientName, title, body, link, locale });

  const resendApiKey = process.env.RESEND_API_KEY;
  let result: EmailProviderResult = { success: false };

  // 2. Mode Production (si Resend API Key fournie)
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Remind Me <notifications@remindme.io>",
          to: recipientEmail,
          subject: title,
          html,
          text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        result = { success: true, messageId: data.id };
      } else {
        const errText = await response.text();
        result = { success: false, error: errText };
      }
    } catch (err: any) {
      result = { success: false, error: err.message };
    }
  } else {
    // 3. Mode Simulation Sécurisé (Développement & Sandbox)
    // Enregistre l'envoi simulé dans les logs sans appel réseau externe
    console.log(`[EmailService:Simulated] To: ${recipientEmail} | Template: ${template} | Subject: "${title}"`);
    result = { success: true, simulated: true, messageId: `sim_${Date.now()}` };
  }

  // 4. Enregistrement dans notification_logs
  if (supabase) {
    try {
      await supabase.from("notification_logs").insert({
        user_id: userId,
        channel: "email",
        recipient: recipientEmail,
        template,
        locale,
        delivery_status: result.simulated ? "simulated_dev" : result.success ? "sent" : "failed",
        idempotency_key: idempotencyKey || null,
        error_message: result.error || null,
      });
    } catch (e) {
      console.error("[EmailService] Log record error:", e);
    }
  }

  return result.success;
}
