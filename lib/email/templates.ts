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
 * Génère le contenu HTML d'un e-mail transactionnel de la marque Remind Me.
 */
export function generateEmailHtml(payload: EmailPayload): string {
  const { recipientName, title, body, link, ctaText = "Open in Remind Me" } = payload;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.remindme.io";
  const rawFullLink = link.startsWith("http") ? link : `${baseUrl}${link}`;

  // Sanitize the link (must be http/https)
  const safeLink = /^https?:\/\//i.test(rawFullLink) ? encodeURI(rawFullLink) : `${baseUrl}/dashboard`;

  const safeTitle = escapeHtml(title);
  const safeRecipientName = escapeHtml(recipientName);
  const safeBody = escapeHtml(body);
  const safeCtaText = escapeHtml(ctaText);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; }
    .header { padding: 28px 32px 20px; border-bottom: 1px solid #F1F5F9; }
    .logo { font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
    .logo span { color: #2563EB; }
    .content { padding: 32px; }
    .title { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px; }
    .body-text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px; }
    .btn { display: inline-block; background-color: #2563EB; color: #FFFFFF !important; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none; text-align: center; }
    .footer { padding: 24px 32px; background: #F8FAFC; border-top: 1px solid #F1F5F9; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Remind<span>Me</span></div>
    </div>
    <div class="content">
      <div class="title">${safeTitle}</div>
      <p class="body-text">Hello ${safeRecipientName},</p>
      <p class="body-text">${safeBody}</p>
      <div style="margin: 28px 0;">
        <a href="${safeLink}" class="btn" target="_blank">${safeCtaText} &rarr;</a>
      </div>
    </div>
    <div class="footer">
      Remind Me — Your work, your time and your money, finally under control.<br>
      <a href="${baseUrl}/settings" style="color: #2563EB; text-decoration: none;">Notification Preferences</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Génère la version texte brut pour les clients e-mail sans HTML.
 */
export function generateEmailText(payload: EmailPayload): string {
  const { recipientName, title, body, link, ctaText = "Open in Remind Me" } = payload;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.remindme.io";
  const fullLink = link.startsWith("http") ? link : `${baseUrl}${link}`;

  return `Remind Me — ${title}

Hello ${recipientName},

${body}

${ctaText}: ${fullLink}

---
Remind Me — Your work, your time and your money under control.
Settings: ${baseUrl}/settings
`;
}
