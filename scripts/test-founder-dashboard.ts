/**
 * Tableau de bord fondateur : indicateurs et résumé quotidien (calculs purs, aucune base ni réseau).
 *   npx tsx scripts/test-founder-dashboard.ts
 */
import { computeFounderMetrics, isFounder, type RawUser, type RawProfile, type RawSubscription } from "../lib/admin/founder-metrics";
import { buildFounderDigest } from "../lib/admin/founder-digest";

let ok = 0;
let total = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${name}${cond || detail === undefined ? "" : " → " + JSON.stringify(detail)}`);
}

const now = new Date("2026-11-08T10:00:00Z").getTime();
const D = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

const users: RawUser[] = [
  { id: "u1", email: "ana@x.com", created_at: iso(now - 2 * 3600_000), email_confirmed_at: null, last_sign_in_at: null }, // aujourd'hui, non confirmée
  { id: "u2", email: "bob@x.com", created_at: iso(now - 3 * D), email_confirmed_at: iso(now - 3 * D), last_sign_in_at: iso(now - D) }, // essai qui finit demain
  { id: "u3", email: "cy@x.com", created_at: iso(now - 20 * D), email_confirmed_at: iso(now - 20 * D), last_sign_in_at: iso(now - 2 * D) }, // Pro payé, expire dans 2 j
  { id: "u4", email: "dee@x.com", created_at: iso(now - 40 * D), email_confirmed_at: iso(now - 40 * D), last_sign_in_at: iso(now - 30 * D) }, // Pro expiré hier
  { id: "u5", email: "eve@x.com", created_at: iso(now - 60 * D), email_confirmed_at: iso(now - 60 * D), last_sign_in_at: iso(now - 3 * D) }, // Premium annuel payé
  { id: "u6", email: "fox@x.com", created_at: iso(now - 15 * D), email_confirmed_at: iso(now - 15 * D), last_sign_in_at: iso(now - 9 * D) }, // essai fini sans payer
  { id: "u7", email: "gus@x.com", created_at: iso(now - 10 * D), email_confirmed_at: iso(now - 10 * D), last_sign_in_at: iso(now - 4 * D) }, // Pro offert (démo)
];
const profiles: RawProfile[] = [
  { id: "u2", full_name: "Bob <Admin>", onboarding_completed: true },
  { id: "u3", full_name: "Cy", onboarding_completed: true },
  { id: "u5", full_name: "Eve", onboarding_completed: true },
];
const subs: RawSubscription[] = [
  { user_id: "u1", plan: "free", status: "active", current_period_end: null },
  { user_id: "u2", plan: "free", status: "active", current_period_end: null, trial_started_at: iso(now - 6 * D), trial_ends_at: iso(now + 20 * 3600_000) },
  { user_id: "u3", plan: "pro", status: "active", current_period_start: iso(now - 28 * D), current_period_end: iso(now + 2 * D), provider: "bictorys", provider_subscription_id: "ch_3" },
  { user_id: "u4", plan: "pro", status: "active", current_period_start: iso(now - 31 * D), current_period_end: iso(now - 12 * 3600_000), provider: "bictorys", provider_subscription_id: "ch_4" },
  { user_id: "u5", plan: "premium", status: "active", current_period_start: iso(now - 5 * 3600_000), current_period_end: iso(now + 365 * D), provider: "bictorys", provider_subscription_id: "ch_5" },
  { user_id: "u6", plan: "free", status: "active", current_period_end: null, trial_started_at: iso(now - 14 * D), trial_ends_at: iso(now - 7 * D) },
  { user_id: "u7", plan: "pro", status: "active", current_period_end: null, provider: "demo" },
];

const m = computeFounderMetrics(users, profiles, subs, { u3: 4, u5: 9 }, now);

check("Total des inscrits", m.users.total === 7, m.users.total);
check("Inscrits aujourd'hui / 7 j / 30 j", m.users.today === 1 && m.users.last7 === 2 && m.users.last30 === 5, m.users);
check("Confirmés et non confirmés", m.users.confirmed === 6 && m.users.unconfirmed === 1);
check("Actifs sur 7 jours", m.users.active7 === 4, m.users.active7);
check("Essai en cours et essai qui finit sous 48 h", m.trials.active === 1 && m.trials.endingSoon === 1 && m.trialsEndingSoon[0]?.id === "u2");
check("Essai terminé sans payer", m.trials.endedNotPaid === 1, m.trials);
check("Payants : Pro 2 (dont 1 offert), Premium 1", m.paid.pro === 2 && m.paid.premium === 1 && m.paid.total === 3);
check("Paiements réels seulement (démo exclue)", m.paid.real === 2, m.paid.real);
check("Revenu mensuel : Pro 5 900 + Premium annuel 125 000/12", m.revenue.monthlyXof === Math.round(5900 + 125000 / 12), m.revenue);
check("Revenu mensuel en dollars : 9 + 190/12", m.revenue.monthlyUsd === Math.round((9 + 190 / 12) * 100) / 100, m.revenue.monthlyUsd);
check("Conversion = payants réels / confirmés", m.paid.conversionRate === Math.round((2 / 6) * 1000) / 10, m.paid.conversionRate);
check("Échéance sous 7 jours : Cy", m.expiringSoon.length === 1 && m.expiringSoon[0]?.id === "u3");
check("Expiré sans renouvellement : Dee", m.recentlyExpired.length === 1 && m.recentlyExpired[0]?.id === "u4");
check("Statut non confirmé prioritaire", m.allUsers.find((u) => u.id === "u1")?.state === "unconfirmed");
check("Nombre d'activités par utilisateur", m.allUsers.find((u) => u.id === "u5")?.activities === 9);
check("Nom par défaut = début de l'e-mail", m.allUsers.find((u) => u.id === "u1")?.name === "ana");
check("Courbe sur 30 jours (30 points, inscription du jour comptée)", m.signupsByDay.length === 30 && m.signupsByDay[29]?.count === 1);
check("Liste triée : plus récent d'abord", m.allUsers[0]?.id === "u1");

const d = buildFounderDigest(m, now, "https://tryremind-me.vercel.app");
check("Résumé : 1 inscription et 1 paiement en 24 h", d.counts.signups === 1 && d.counts.payments === 1, d.counts);
check("Résumé : échéance sous 3 jours et expiration en 24 h", d.counts.expiringSoon === 1 && d.counts.expired === 1, d.counts);
check("Résumé : essai qui finit", d.counts.trialsEnding === 1);
check("Résumé : sujet explicite", d.subject.includes("1 inscription(s)") && d.subject.includes("1 paiement(s)"), d.subject);
check("Résumé : texte utilisateur échappé (pas de HTML injecté)", !d.telegramHtml.includes("<Admin>") && d.telegramHtml.includes("&lt;Admin&gt;"));
check("Résumé : lien vers le tableau de bord", d.telegramHtml.includes("https://tryremind-me.vercel.app/admin"));
check("Résumé : revenu en FCFA", d.telegramHtml.includes("FCFA"));

const quiet = buildFounderDigest(computeFounderMetrics([], [], [], {}, now), now);
check("Journée calme : message court « rien de nouveau »", quiet.quiet && quiet.telegramHtml.includes("Rien de nouveau"));

process.env.FOUNDER_EMAILS = "Founder@Example.com, autre@x.com";
check("Fondateur reconnu (casse ignorée)", isFounder("founder@example.com") && isFounder("AUTRE@x.com"));
check("Autre compte refusé", !isFounder("intrus@x.com") && !isFounder(null));
process.env.FOUNDER_EMAILS = "";
check("Sans FOUNDER_EMAILS : personne n'a accès", !isFounder("founder@example.com"));

console.log(`\n${ok}/${total} tests réussis`);
if (ok !== total) process.exit(1);
