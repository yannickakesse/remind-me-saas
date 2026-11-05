/**
 * Phase 1 — tests automatiques : cohérence des offres et choix de la voix standard.
 * Lancer : npx tsx scripts/test-phase1-offers-voice.ts
 */
import { PLAN_ENTITLEMENTS, PLAN_COMING_SOON, isFeatureAllowed } from "../lib/subscriptions/entitlements";
import { resolveStandardAlertKey, STANDARD_ALERTS_READY } from "../lib/voice/standard-alerts";
import texts from "../lib/voice/standard-alerts-texts.json";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}`);
}

// Offres
check("Free : multi-devises incluse", isFeatureAllowed("free", "multiCurrency"));
check("Free : automatisations récurrentes incluses", isFeatureAllowed("free", "recurringAutomation"));
check("Free : rentabilité horaire réservée à Pro", !isFeatureAllowed("free", "hourlyProfitability") && isFeatureAllowed("pro", "hourlyProfitability"));
check("Aucun forfait n'accorde l'assistant IA (pas encore développé)", (["free", "pro", "premium"] as const).every((p) => !PLAN_ENTITLEMENTS[p].aiAssistant));
check("Aucun forfait n'accorde les insights prédictifs", (["free", "pro", "premium"] as const).every((p) => !PLAN_ENTITLEMENTS[p].predictiveInsights));
check("Premium : l'assistant IA est affiché « Bientôt »", PLAN_COMING_SOON.premium.some((l) => l.includes("Assistant IA")));
check("Quotas Free inchangés (3 / 5 / 2 / 3)", PLAN_ENTITLEMENTS.free.maxActivities === 3 && PLAN_ENTITLEMENTS.free.maxClients === 5 && PLAN_ENTITLEMENTS.free.maxGoals === 2 && PLAN_ENTITLEMENTS.free.maxBudgets === 3);
check("Prix inchangés (Pro 9, Premium 19)", PLAN_ENTITLEMENTS.pro.priceMonthly === 9 && PLAN_ENTITLEMENTS.premium.priceMonthly === 19);

// Voix standard
check("Audios standard activés", STANDARD_ALERTS_READY);
check("Accueil du matin → phrase enregistrée", resolveStandardAlertKey({ kind: "morning_briefing" }) === "morning_briefing");
check("Aperçu des Paramètres → « dans quinze minutes »", resolveStandardAlertKey({ kind: "activity_reminder_15m" }) === "activity_in_15m");
check("Test de la voix → rappel général", resolveStandardAlertKey({ kind: "generic" }) === "generic");
check("Chaque phrase choisie existe en 5 langues", ["morning_briefing", "evening_checkin", "activity_in_15m", "generic"].every((k) =>
  ["fr", "en", "es", "de", "pt"].every((l) => Boolean((texts as any).texts[k]?.[l]))
));

console.log(`\n${ok}/${total} tests réussis`);
if (ok !== total) process.exit(1);
