import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface SendWhatsAppOptions {
  userId: string;
  recipientPhone: string;
  message: string;
  templateName?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface WhatsAppProviderResult {
  success: boolean;
  status: "sent" | "failed" | "not_configured";
  messageId?: string;
  error?: string;
  configured: boolean;
}

/**
 * Service d'intégration WhatsApp pour Remind Me.
 *
 * Supporte les architectures officielles :
 * 1. Twilio Programmable Messaging (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)
 * 2. Meta WhatsApp Business Cloud API (WHATSAPP_CLOUD_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID)
 *
 * RÈGLE STRICTE : Si aucun fournisseur n'est configuré dans les variables d'environnement,
 * ce service renvoie explicitement le statut `not_configured` sans JAMAIS simuler
 * un faux envoi.
 */
export async function sendWhatsAppNotification(
  options: SendWhatsAppOptions,
  supabase?: SupabaseClient<Database>
): Promise<WhatsAppProviderResult> {
  const { userId, recipientPhone, message, templateName, idempotencyKey } = options;

  // 1. Détection de la configuration des fournisseurs
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;

  const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const isConfigured = Boolean((twilioSid && twilioToken && twilioFrom) || (metaToken && metaPhoneId));

  if (!isConfigured) {
    const errorMsg =
      "Canal WhatsApp non opérationnel : aucun fournisseur officiel (Twilio ou Meta Cloud API) n'est configuré dans les variables d'environnement.";

    if (supabase) {
      try {
        await supabase.from("notification_logs").insert({
          user_id: userId,
          channel: "whatsapp" as any,
          recipient: recipientPhone || "unspecified",
          template: templateName || "general_alert",
          delivery_status: "failed",
          idempotency_key: idempotencyKey || null,
          error_message: errorMsg,
        });
      } catch (logErr) {
        console.debug("[WhatsAppService] Log error:", logErr);
      }
    }

    return {
      success: false,
      status: "not_configured",
      configured: false,
      error: errorMsg,
    };
  }

  // 2. Envoi via Twilio WhatsApp API si configuré
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;

      const formattedTo = recipientPhone.startsWith("whatsapp:")
        ? recipientPhone
        : `whatsapp:${recipientPhone.replace(/[^\d+]/g, "")}`;
      const formattedFrom = twilioFrom.startsWith("whatsapp:")
        ? twilioFrom
        : `whatsapp:${twilioFrom.replace(/[^\d+]/g, "")}`;

      const formData = new URLSearchParams();
      formData.append("From", formattedFrom);
      formData.append("To", formattedTo);
      formData.append("Body", message);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          status: "sent",
          configured: true,
          messageId: data.sid,
        };
      } else {
        const errText = await response.text();
        return {
          success: false,
          status: "failed",
          configured: true,
          error: `Twilio API Error: ${errText}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        status: "failed",
        configured: true,
        error: err.message,
      };
    }
  }

  // 3. Envoi via Meta WhatsApp Cloud API si configuré
  if (metaToken && metaPhoneId) {
    try {
      const url = `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`;
      const cleanPhone = recipientPhone.replace(/[^\d]/g, "");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          status: "sent",
          configured: true,
          messageId: data.messages?.[0]?.id,
        };
      } else {
        const errText = await response.text();
        return {
          success: false,
          status: "failed",
          configured: true,
          error: `Meta Cloud API Error: ${errText}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        status: "failed",
        configured: true,
        error: err.message,
      };
    }
  }

  return {
    success: false,
    status: "not_configured",
    configured: false,
    error: "Aucun fournisseur WhatsApp actif.",
  };
}
