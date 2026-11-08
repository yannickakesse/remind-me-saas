/**
 * Résumé quotidien du fondateur (Telegram + e-mail) : ce qui s'est passé en 24 h et ce qui arrive.
 * Calcul pur à partir des indicateurs : testable sans base ni réseau.
 */
import type { FounderMetrics, FounderUserRow } from "./founder-metrics";

const DAY = 86_400_000;

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtXof = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Abidjan" }) : "—";
const planLabel = (r: FounderUserRow) => (r.plan === "premium" ? "Premium" : r.plan === "pro" ? "Pro" : "Gratuit");

export interface FounderDigest {
  subject: string;
  telegramHtml: string;
  emailHtml: string;
  /** Rien de nouveau ni d'urgent : le message reste court. */
  quiet: boolean;
  counts: { signups: number; payments: number; expiringSoon: number; expired: number; trialsEnding: number };
}

export function buildFounderDigest(m: FounderMetrics, nowMs: number = Date.now(), appUrl = "https://tryremind-me.vercel.app"): FounderDigest {
  const since = nowMs - DAY;
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);

  const signups = m.allUsers.filter((r) => t(r.createdAt) >= since);
  const payments = m.allUsers.filter((r) => r.paidAt && t(r.paidAt) >= since);
  const expiringSoon = m.expiringSoon.filter((r) => t(r.endsAt) - nowMs <= 3 * DAY);
  const expired = m.recentlyExpired.filter((r) => t(r.endsAt) >= since);
  const trialsEnding = m.trialsEndingSoon;

  const quiet = !signups.length && !payments.length && !expiringSoon.length && !expired.length && !trialsEnding.length;

  const section = (title: string, list: FounderUserRow[], line: (r: FounderUserRow) => string) =>
    list.length ? [`\n<b>${title} (${list.length})</b>`, ...list.slice(0, 15).map((r) => `• ${line(r)}`), list.length > 15 ? `… et ${list.length - 15} autre(s)` : ""].filter(Boolean) : [];

  const lines = [
    `📊 <b>Remind Me — résumé du jour</b>`,
    ``,
    `👥 Inscrits : <b>${m.users.total}</b> (+${signups.length} en 24 h, ${m.users.unconfirmed} non confirmés)`,
    `🟢 Actifs sur 7 jours : <b>${m.users.active7}</b>`,
    `⏳ Essais en cours : <b>${m.trials.active}</b>`,
    `💎 Abonnés payants : <b>${m.paid.real}</b> (Pro ${m.paid.pro} · Premium ${m.paid.premium})`,
    `💰 Revenu mensuel estimé : <b>${fmtXof(m.revenue.monthlyXof)}</b> (~$${m.revenue.monthlyUsd})`,
    ...section("🚀 Nouvelles inscriptions", signups, (r) => `${esc(r.name)} — <code>${esc(r.email)}</code>${r.confirmed ? "" : " (e-mail non confirmé)"}`),
    ...section("💳 Paiements reçus", payments, (r) => `${esc(r.name)} — ${planLabel(r)}`),
    ...section("⚠️ Abonnements qui expirent sous 3 jours", expiringSoon, (r) => `${esc(r.name)} — ${planLabel(r)}, fin le ${fmtDate(r.endsAt)}`),
    ...section("❌ Abonnements expirés (non renouvelés)", expired, (r) => `${esc(r.name)} — fin le ${fmtDate(r.endsAt)}`),
    ...section("⌛ Essais qui se terminent sous 48 h", trialsEnding, (r) => `${esc(r.name)} — fin le ${fmtDate(r.endsAt)}`),
    quiet ? `\n✅ Rien de nouveau ni d'urgent aujourd'hui.` : "",
    `\n🔗 Tableau de bord : ${appUrl}/admin`,
  ].filter((l) => l !== "");

  const telegramHtml = lines.join("\n");
  const emailHtml = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#17211D;max-width:560px">${lines
    .map((l) => l.replace(/<code>/g, "").replace(/<\/code>/g, ""))
    .join("<br>")
    .replace(`${appUrl}/admin`, `<a href="${appUrl}/admin">${appUrl}/admin</a>`)}</div>`;

  const parts = [
    signups.length ? `${signups.length} inscription(s)` : "",
    payments.length ? `${payments.length} paiement(s)` : "",
    expiringSoon.length + expired.length ? `${expiringSoon.length + expired.length} échéance(s)` : "",
  ].filter(Boolean);
  const subject = `Remind Me — ${parts.length ? parts.join(", ") : "résumé du jour"}`;

  return {
    subject,
    telegramHtml,
    emailHtml,
    quiet,
    counts: { signups: signups.length, payments: payments.length, expiringSoon: expiringSoon.length, expired: expired.length, trialsEnding: trialsEnding.length },
  };
}
