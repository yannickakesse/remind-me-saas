import type { SupportedLocale } from "@/types/database";

export interface EmailPayload {
  recipientName: string;
  title: string;
  body: string;
  link: string;
  ctaText?: string;
  locale?: SupportedLocale;
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
 * Génère le contenu HTML d'un e-mail transactionnel aux couleurs de la marque Remind Me.
 */
export function generateEmailHtml(payload: EmailPayload): string {
  const { recipientName, title, body, link, ctaText = "Accéder à Remind Me", locale = "fr" } = payload;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.remindme.io";
  const rawFullLink = link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  // Sanitize the link (must be http/https)
  const safeLink = /^https?:\/\//i.test(rawFullLink) ? encodeURI(rawFullLink) : `${baseUrl}/dashboard`;

  const safeTitle = escapeHtml(title);
  const safeRecipientName = escapeHtml(recipientName);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
  const safeCtaText = escapeHtml(ctaText);

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F172A; color: #F8FAFC; margin: 0; padding: 24px 12px; }
    .container { max-width: 580px; margin: 0 auto; background: #1E293B; border-radius: 20px; border: 1px solid rgba(229, 169, 30, 0.25); overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { padding: 28px 32px 20px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }
    .logo span { color: #E5A91E; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(229, 169, 30, 0.15); border: 1px solid rgba(229, 169, 30, 0.4); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FBBF24; }
    .content { padding: 32px; }
    .title { font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 16px; line-height: 1.3; }
    .greeting { font-size: 15px; font-weight: 600; color: #E2E8F0; margin: 0 0 12px; }
    .body-box { background: #0F172A; border-radius: 14px; border: 1px solid #334155; padding: 18px 20px; margin: 16px 0 24px; font-size: 14px; line-height: 1.6; color: #CBD5E1; }
    .btn { display: inline-block; background: linear-gradient(135deg, #E5A91E 0%, #B48212 100%); color: #FFFFFF !important; font-weight: 700; font-size: 14px; padding: 13px 26px; border-radius: 12px; text-decoration: none; text-align: center; box-shadow: 0 4px 14px rgba(229, 169, 30, 0.35); }
    .footer { padding: 20px 32px; background: #0F172A; border-top: 1px solid #334155; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5; }
    .footer a { color: #FBBF24; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Remind<span>Me</span></div>
      <div class="badge">Rappel Automatique</div>
    </div>
    <div class="content">
      <div class="title">${safeTitle}</div>
      <p class="greeting">Bonjour ${safeRecipientName},</p>
      <div class="body-box">
        ${safeBody}
      </div>
      <div style="margin: 28px 0 12px;">
        <a href="${safeLink}" class="btn" target="_blank">${safeCtaText} &rarr;</a>
      </div>
    </div>
    <div class="footer">
      Remind Me • Multi-activités, planning et rentabilité en toute sérénité.<br>
      Pour ajuster vos alertes, accédez à vos <a href="${baseUrl}/settings">Paramètres de notifications</a>.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Génère la version texte brut pour les clients e-mail sans HTML.
 */
export function generateEmailText(payload: EmailPayload): string {
  const { recipientName, title, body, link, ctaText = "Ouvrir dans Remind Me" } = payload;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.remindme.io";
  const fullLink = link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  return `Remind Me — ${title}

Bonjour ${recipientName},

${body}

${ctaText} : ${fullLink}

---
Remind Me — Multi-activités, planning et rentabilité.
Paramètres : ${baseUrl}/settings
`;
}
