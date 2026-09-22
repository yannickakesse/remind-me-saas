/**
 * Service d'alerte instantanée Admin pour Remind Me.
 * Notifie le propriétaire de l'application sur son smartphone (Telegram, Discord, Email)
 * lors de chaque nouvelle inscription, confirmation d'e-mail ou événement clé.
 */

export interface AdminEventData {
  type: "signup" | "email_confirmed" | "test_alert" | "payment_received" | "system_alert";
  email?: string;
  fullName?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

/**
 * Envoie une notification Telegram au créateur du SaaS
 */
async function sendTelegramAlert(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      console.warn(`[Admin:Notifier] Erreur Telegram (${res.status}):`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Admin:Notifier] Exception Telegram:", err);
    return false;
  }
}

/**
 * Envoie une notification Discord Webhook au créateur du SaaS
 */
async function sendDiscordAlert(title: string, description: string, fields: { name: string; value: string; inline?: boolean }[]): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return false;
  }

  try {
    const payload = {
      embeds: [
        {
          title,
          description,
          color: 0xf59e0b, // Remind Me Gold
          fields,
          timestamp: new Date().toISOString(),
          footer: {
            text: "Remind Me • Admin Live Monitor",
          },
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error("[Admin:Notifier] Exception Discord:", err);
    return false;
  }
}

/**
 * Notifie l'admin d'un nouvel événement
 */
export async function notifyAdmin(event: AdminEventData): Promise<{ telegram: boolean; discord: boolean }> {
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  let telegramMessage = "";
  let discordTitle = "";
  let discordDescription = "";
  let discordFields: { name: string; value: string; inline?: boolean }[] = [];

  switch (event.type) {
    case "signup":
      telegramMessage = `🚀 <b>NOUVELLE INSCRIPTION !</b>\n\n` +
        `👤 <b>Nom :</b> ${event.fullName || "Non renseigné"}\n` +
        `📧 <b>Email :</b> <code>${event.email}</code>\n` +
        `🕒 <b>Date :</b> ${now}\n` +
        `⏳ <b>Statut :</b> En attente de confirmation e-mail`;

      discordTitle = "🚀 Nouvelle Inscription Utilisateur";
      discordDescription = `Un nouvel utilisateur vient de créer son compte sur **Remind Me**.`;
      discordFields = [
        { name: "Nom", value: event.fullName || "Non renseigné", inline: true },
        { name: "Email", value: `\`${event.email}\``, inline: true },
        { name: "Statut", value: "⏳ En attente de confirmation", inline: false },
      ];
      break;

    case "email_confirmed":
      telegramMessage = `🎉 <b>E-MAIL CONFIRMÉ !</b>\n\n` +
        `📧 <b>Email :</b> <code>${event.email}</code>\n` +
        `🕒 <b>Date :</b> ${now}\n` +
        `✅ <b>Statut :</b> Compte activé et prêt à l'emploi`;

      discordTitle = "🎉 Adresse E-mail Confirmée";
      discordDescription = `L'utilisateur a cliqué sur le bouton de confirmation dans son e-mail.`;
      discordFields = [
        { name: "Email", value: `\`${event.email}\``, inline: true },
        { name: "Statut", value: "✅ Compte 100% activé", inline: true },
      ];
      break;

    case "payment_received":
      telegramMessage = `💳 <b>PAIEMENT CONFIRMÉ (BICTORYS) !</b>\n\n` +
        `👤 <b>Client :</b> ${event.fullName || "Utilisateur"}\n` +
        `📧 <b>Email :</b> <code>${event.email}</code>\n` +
        `💰 <b>Montant :</b> ${event.details?.amount || "N/A"}\n` +
        `⚡ <b>Forfait :</b> <b>${event.details?.plan?.toUpperCase()}</b> (${event.details?.billingCycle})\n` +
        `🕒 <b>Date :</b> ${now}\n` +
        `✅ <b>Statut :</b> Abonnement activé instantanément !`;

      discordTitle = "💳 Nouveau Paiement Confirmé";
      discordDescription = `Un abonnement a été souscrit et validé avec succès sur **Remind Me**.`;
      discordFields = [
        { name: "Client", value: event.fullName || "Utilisateur", inline: true },
        { name: "Email", value: `\`${event.email}\``, inline: true },
        { name: "Forfait", value: `${event.details?.plan?.toUpperCase()} (${event.details?.billingCycle})`, inline: true },
        { name: "Montant", value: event.details?.amount || "N/A", inline: true },
      ];
      break;

    default:
      telegramMessage = `ℹ️ <b>Événement Remind Me :</b> ${event.type}`;
      discordTitle = "ℹ️ Événement Système";
      discordDescription = JSON.stringify(event.details || {});
  }

  // Exécution non-bloquante en parallèle
  const [telegram, discord] = await Promise.all([
    sendTelegramAlert(telegramMessage),
    sendDiscordAlert(discordTitle, discordDescription, discordFields),
  ]);

  return { telegram, discord };
}
