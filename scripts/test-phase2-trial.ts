/**
 * Phase 2 — tests du calcul des droits avec l'essai de 7 jours (heure serveur).
 * Lancer : npx tsx scripts/test-phase2-trial.ts
 */
import { resolveEffectivePlan, getPlanEntitlements, TRIAL_DAYS } from "../lib/subscriptions/entitlements";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}`);
}

const DAY = 86_400_000;
const start = Date.UTC(2026, 10, 5, 10, 0, 0); // 5 nov. 2026, 10:00 UTC
const iso = (ms: number) => new Date(ms).toISOString();
const trialRow = { plan: "free", status: "active", trial_started_at: iso(start), trial_ends_at: iso(start + TRIAL_DAYS * DAY) };

const r0 = resolveEffectivePlan({ plan: "free", status: "active" }, start);
check("Compte gratuit sans essai → Free", r0.plan === "free" && !r0.isTrial && r0.trialDaysLeft === 0);

const r1 = resolveEffectivePlan(trialRow, start + 1000);
check("J0 de l'essai → droits Pro, 7 jours restants", r1.plan === "pro" && r1.isTrial && r1.trialDaysLeft === 7);
check("Pendant l'essai, le forfait payé reste Free", r1.paidPlan === "free");
check("Pendant l'essai, quotas Pro (15 activités)", getPlanEntitlements(r1.plan).maxActivities === 15);
check("Pendant l'essai, aucune fonction Premium à coût externe", r1.plan !== "premium");

const r6 = resolveEffectivePlan(trialRow, start + 6 * DAY + 3600_000);
check("J6 + 1 h → dernier jour (1 jour restant)", r6.isTrial && r6.trialDaysLeft === 1);

const rEnd = resolveEffectivePlan(trialRow, start + TRIAL_DAYS * DAY + 60_000);
check("J7 + 1 min → retour automatique en Free", rEnd.plan === "free" && !rEnd.isTrial);

const rEdge = resolveEffectivePlan(trialRow, start + TRIAL_DAYS * DAY);
check("Pile à l'échéance → Free (pas de minute offerte)", rEdge.plan === "free");

const rPaid = resolveEffectivePlan({ ...trialRow, plan: "premium", current_period_end: iso(start + 30 * DAY) }, start + DAY);
check("Abonnement Premium pris pendant l'essai → Premium payé, plus d'essai", rPaid.plan === "premium" && !rPaid.isTrial);

const rPaidExpired = resolveEffectivePlan({ plan: "pro", status: "active", current_period_end: iso(start - DAY) }, start);
check("Abonnement Pro expiré → Free", rPaidExpired.plan === "free");

const rInactive = resolveEffectivePlan({ plan: "pro", status: "canceled" }, start);
check("Abonnement inactif → Free", rInactive.plan === "free");

const rBadDate = resolveEffectivePlan({ plan: "free", status: "active", trial_ends_at: "pas-une-date" }, start);
check("Date d'essai invalide → Free (jamais d'essai infini)", rBadDate.plan === "free");

check("Aucune ligne d'abonnement → Free", resolveEffectivePlan(null, start).plan === "free");

console.log(`\n${ok}/${total} tests réussis`);
if (ok !== total) process.exit(1);
