import { DateTime } from "luxon";
import type { SupportedLocale } from "@/types/database";
import { getAppUrl } from "@/lib/auth/url";

export interface EmailPayload {
  recipientName: string;
  title: string;
  body: string;
  link: string;
  ctaText?: string;
  locale?: SupportedLocale;
  template?: string;
  dateStr?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

/**
 * Échappe les caractères spéciaux HTML pour prévenir toute injection dans les e-mails.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Nettoie les salutations redondantes au début d'un corps de texte
 * pour éviter les répétitions avec l'en-tête "Bonjour / Bonsoir Prénom,".
 */
export function cleanBodyRedundancies(body: string, recipientName: string): string {
  if (!body) return "";
  let cleaned = body.trim();

  // Supprimer les formules redondantes de début ("Bonjour !", "Bonjour Yannick,", "Bonsoir !", etc.)
  const regex = new RegExp(
    `^(bonjour|bonsoir)(\\s*!|\\s*,|\\s+${recipientName}\\s*[,!]?)(\\s*)`,
    "i"
  );
  cleaned = cleaned.replace(regex, "").trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Détermine le badge de catégorie de l'e-mail.
 */
function getBadgeInfo(template?: string, title?: string): { label: string; color: string; bg: string; border: string } {
  const lowerTitle = (title || "").toLowerCase();
  const lowerTpl = (template || "").toLowerCase();

  if (lowerTpl.includes("evening") || lowerTitle.includes("bilan du soir") || lowerTitle.includes("soir")) {
    return { label: "Bilan du Soir", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" };
  }
  if (lowerTpl.includes("midday") || lowerTitle.includes("mi-journée") || lowerTitle.includes("midi")) {
    return { label: "Point Mi-Journée", color: "#38BDF8", bg: "rgba(56, 189, 248, 0.12)", border: "rgba(56, 189, 248, 0.3)" };
  }
  if (lowerTpl.includes("morning") || lowerTpl.includes("daily_briefing") || lowerTitle.includes("matin") || lowerTitle.includes("programme")) {
    return { label: "Briefing Matin", color: "#FBBF24", bg: "rgba(251, 191, 36, 0.12)", border: "rgba(251, 191, 36, 0.3)" };
  }
  if (lowerTpl.includes("payment") || lowerTitle.includes("paiement") || lowerTitle.includes("revenu")) {
    return { label: "Finances & Revenus", color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" };
  }
  if (lowerTpl.includes("expense") || lowerTitle.includes("dépense")) {
    return { label: "Dépense Programmée", color: "#F43F5E", bg: "rgba(244, 63, 94, 0.12)", border: "rgba(244, 63, 94, 0.3)" };
  }
  return { label: "Rappel Remind Me", color: "#E5A91E", bg: "rgba(229, 169, 30, 0.12)", border: "rgba(229, 169, 30, 0.3)" };
}

/**
 * Génère le contenu HTML d'un e-mail transactionnel premium aux couleurs officielles de Remind Me.
 * Conforme aux standards HTML email (compatibilité Gmail, Apple Mail, Outlook, mobile).
 */
export function generateEmailHtml(payload: EmailPayload): string {
  const {
    recipientName,
    title,
    body,
    link,
    ctaText = "Accéder à Remind Me",
    locale = "fr",
    template,
    timezone = "Africa/Abidjan",
  } = payload;

  const baseUrl = getAppUrl();
  const rawFullLink = link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
  const safeLink = /^https?:\/\//i.test(rawFullLink) ? encodeURI(rawFullLink) : `${baseUrl}/dashboard`;

  // Nom nettoyé
  const cleanRecipientName = (recipientName || "Bonjour").trim().split(" ")[0] || "Bonjour";
  const safeRecipientName = escapeHtml(cleanRecipientName);

  // Nettoyage du titre pour éviter les redondances avec le nom
  let cleanTitle = title;
  const greetingInTitle = new RegExp(`^🌅\\s*Bonjour\\s+${cleanRecipientName}\\s*!\\s*`, "i");
  if (greetingInTitle.test(cleanTitle)) {
    cleanTitle = cleanTitle.replace(greetingInTitle, "🌅 ");
  }

  const safeTitle = escapeHtml(cleanTitle);

  // Nettoyage des redondances dans le corps
  const cleanedBody = cleanBodyRedundancies(body, cleanRecipientName);
  const safeBody = escapeHtml(cleanedBody).replace(/\n/g, "<br>");
  const safeCtaText = escapeHtml(ctaText);

  // Moment de la journée et salutation adaptée
  const now = DateTime.now().setZone(timezone);
  const hour = now.hour;
  const isEvening =
    template === "evening_checkin" ||
    title.toLowerCase().includes("bilan du soir") ||
    title.toLowerCase().includes("soir") ||
    hour >= 18;

  const greetingWord = isEvening ? "Bonsoir" : "Bonjour";

  // Date du jour formatée lisiblement
  let formattedDate = "";
  try {
    const luxonLocale = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "fr-FR";
    formattedDate = now.setLocale(luxonLocale).toFormat("EEEE d MMMM yyyy");
    if (formattedDate) {
      formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }
  } catch {
    formattedDate = now.toISODate() || "";
  }

  const badge = getBadgeInfo(template, title);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${locale}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${safeTitle}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #090D16; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-content { padding: 24px 18px !important; }
      .email-header { padding: 20px 18px !important; }
      .email-body-box { padding: 16px 14px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #090D16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <center style="width: 100%; background-color: #090D16;">
    <!-- CONTAINER PRINCIPAL -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" class="email-container" style="max-width: 580px; width: 100%; margin: 0 auto; background-color: #111827; border-radius: 18px; border: 1px solid #1F2937; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);">
      
      <!-- HEADER AVEC LOGO OFFICIEL REMIND ME -->
      <tr>
        <td class="email-header" style="padding: 24px 28px 20px; border-bottom: 1px solid #1E293B; background-color: #111827;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <!-- LOGO OFFICIEL & NOM -->
              <td align="left" valign="middle">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle" style="padding-right: 12px;">
                      <img src="${baseUrl}/icons/icon-192x192.png" width="38" height="38" alt="Remind Me" style="display: block; width: 38px; height: 38px; border-radius: 10px; border: 0;" />
                    </td>
                    <td valign="middle">
                      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.4px;">
                        Remind<span style="color: #F59E0B;">Me</span>
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
              <!-- BADGE CATÉGORIE -->
              <td align="right" valign="middle">
                <span style="display: inline-block; padding: 5px 12px; background-color: ${badge.bg}; border: 1px solid ${badge.border}; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: ${badge.color}; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${badge.label}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CONTENU DU MESSAGE -->
      <tr>
        <td class="email-content" style="padding: 28px 28px 24px; background-color: #111827;">
          
          <!-- DATE DU JOUR & CONTEXTE TEMPOREL -->
          ${
            formattedDate
              ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                  <tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.8px;">
                      📅 ${formattedDate}
                    </td>
                  </tr>
                </table>`
              : ""
          }

          <!-- TITRE DU RAPPEL -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 800; color: #FFFFFF; line-height: 1.35; padding-bottom: 14px;">
                ${safeTitle}
              </td>
            </tr>
          </table>

          <!-- SALUTATION PROPRE & NON-RÉPÉTITIVE -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #E2E8F0; padding-bottom: 12px;">
                ${greetingWord} ${safeRecipientName},
              </td>
            </tr>
          </table>

          <!-- CORPS DU MESSAGE DANS UN ENCART MODERNE -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-body-box" style="background-color: #172033; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; margin-bottom: 24px;">
            <tr>
              <td style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.65; color: #CBD5E1;">
                ${safeBody}
              </td>
            </tr>
          </table>

          <!-- BOUTON D'ACTION (CTA) ÉLÉGANT -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 10px;">
            <tr>
              <td align="center" style="border-radius: 10px; background-color: #F59E0B;">
                <a href="${safeLink}" target="_blank" style="display: inline-block; padding: 13px 26px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: #0F172A; text-decoration: none; border-radius: 10px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">
                  ${safeCtaText} &rarr;
                </a>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding: 22px 28px; background-color: #0C1220; border-top: 1px solid #1E293B; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.6; color: #64748B;">
                <span style="font-weight: 600; color: #94A3B8;">Remind Me</span> • Multi-activités, planning et rentabilité en toute sérénité.<br>
                Pour ajuster la fréquence de vos alertes, accédez à vos 
                <a href="${baseUrl}/settings" target="_blank" style="color: #F59E0B; text-decoration: underline; font-weight: 600;">Paramètres de notifications</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>`;
}

/**
 * Génère la version texte brut pour les clients e-mail sans HTML.
 */
export function generateEmailText(payload: EmailPayload): string {
  const { recipientName, title, body, link, ctaText = "Ouvrir dans Remind Me", template } = payload;
  const baseUrl = getAppUrl();
  const fullLink = link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  const cleanRecipientName = (recipientName || "Bonjour").trim().split(" ")[0] || "Bonjour";
  const cleanedBody = cleanBodyRedundancies(body, cleanRecipientName);

  const isEvening =
    template === "evening_checkin" ||
    title.toLowerCase().includes("bilan du soir") ||
    title.toLowerCase().includes("soir");

  const greetingWord = isEvening ? "Bonsoir" : "Bonjour";

  return `Remind Me — ${title}

${greetingWord} ${cleanRecipientName},

${cleanedBody}

${ctaText} : ${fullLink}

---
Remind Me • Multi-activités, planning et rentabilité.
Paramètres : ${baseUrl}/settings
`;
}
