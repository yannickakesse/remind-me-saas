import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SupportedLocale } from "@/types/database";
import { generateEmailHtml, generateEmailText } from "./templates";
import { checkRateLimit } from "@/lib/security/rate-limit";

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
  status: "sent" | "failed" | "not_configured";
  messageId?: string;
  error?: string;
  configured: boolean;
}

/**
 * Service d'envoi d'e-mails transactionnels Remind Me.
 *
 * S'appuie sur l'API officielle Resend (https://resend.com).
 * En l'absence de clé d'API, renvoie un statut explicite 'not_configured' sans
 * simuler de faux succès pour garantir une traçabilité 100% fidèle.
 */
export async function sendNotificationEmail(
  options: SendEmailOptions,
  supabase?: SupabaseClient<Database>
): Promise<EmailProviderResult> {
  const {
    userId,
    recipientEmail,
    recipientName,
    template,
    title,
    body,
    link,
    locale = "fr",
    idempotencyKey,
  } = options;

  // 1. Vérification du rate limiting (max 30 e-mails par heure par utilisateur)
  const rl = checkRateLimit(`email:${userId}`, 30, 3600);
  if (!rl.success) {
    console.warn(`[EmailService:RateLimit] User ${userId} a dépassé son quota d'emails.`);
    return {
      success: false,
      status: "failed",
      configured: true,
      error: "Limite d'envoi d'e-mails atteinte (30/heure).",
    };
  }

  // 2. Vérification d'idempotence via les logs
  if (supabase && idempotencyKey) {
    const { data: existingLog } = await supabase
      .from("notification_logs")
      .select("id, delivery_status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog && existingLog.delivery_status === "sent") {
      // Déjà envoyé et tracé, pas de doublon
      return {
        success: true,
        status: "sent",
        configured: true,
        messageId: `idempotent_${existingLog.id}`,
      };
    }
  }

  const html = generateEmailHtml({ recipientName, title, body, link, locale });
  const text = generateEmailText({ recipientName, title, body, link, locale });

  const resendApiKey = process.env.RESEND_API_KEY;

  // 3. Cas où le fournisseur d'e-mail n'est pas encore configuré
  if (!resendApiKey) {
    const reason = "Fournisseur d'e-mail non configuré (variable RESEND_API_KEY manquante).";
    console.warn(`[EmailService:Unconfigured] Pour ${recipientEmail} : ${reason}`);

    if (supabase) {
      try {
        await supabase.from("notification_logs").insert({
          user_id: userId,
          channel: "email",
          recipient: recipientEmail,
          template,
          locale,
          delivery_status: "failed",
          idempotency_key: idempotencyKey || null,
          error_message: reason,
        });
      } catch (e) {
        console.error("[EmailService] Log error:", e);
      }
    }

    return {
      success: false,
      status: "not_configured",
      configured: false,
      error: reason,
    };
  }

  // 4. Envoi réel via l'API Resend
  try {
    const fromAddress = process.env.EMAIL_FROM || "Remind Me <onboarding@resend.dev>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipientEmail,
        subject: title,
        html,
        text,
      }),
    });

    if (response.ok) {
      const data = await response.json();

      if (supabase) {
        try {
          await supabase.from("notification_logs").insert({
            user_id: userId,
            channel: "email",
            recipient: recipientEmail,
            template,
            locale,
            delivery_status: "sent",
            idempotency_key: idempotencyKey || null,
          });
        } catch (e) {
          console.error("[EmailService] Log record error:", e);
        }
      }

      return {
        success: true,
        status: "sent",
        configured: true,
        messageId: data.id,
      };
    } else {
      const errText = await response.text();
      let parsedError = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedError = jsonErr.message || errText;
      } catch {}

      if (supabase) {
        try {
          await supabase.from("notification_logs").insert({
            user_id: userId,
            channel: "email",
            recipient: recipientEmail,
            template,
            locale,
            delivery_status: "failed",
            idempotency_key: idempotencyKey || null,
            error_message: parsedError,
          });
        } catch (e) {
          console.error("[EmailService] Log record error:", e);
        }
      }

      return {
        success: false,
        status: "failed",
        configured: true,
        error: `Erreur Resend API: ${parsedError}`,
      };
    }
  } catch (err: any) {
    if (supabase) {
      try {
        await supabase.from("notification_logs").insert({
          user_id: userId,
          channel: "email",
          recipient: recipientEmail,
          template,
          locale,
          delivery_status: "failed",
          idempotency_key: idempotencyKey || null,
          error_message: err.message,
        });
      } catch (e) {
        console.error("[EmailService] Log record error:", e);
      }
    }

    return {
      success: false,
      status: "failed",
      configured: true,
      error: err.message,
    };
  }
}
