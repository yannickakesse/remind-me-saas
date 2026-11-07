/**
 * Offres — rythme d'affichage, pages protégées, paiement anticipé, formats de prix.
 * Lancer : npx tsx scripts/test-offers.ts
 */
import { pickOffer, isOfferBlockedPath, type OfferContext } from "../lib/subscriptions/offer-rules";
import { computePaidPeriod, formatUsd, formatXof, PLAN_PRICES_XOF, FIRST_MONTH_PRICE_USD, isFirstMonthEligible, checkoutAmountXof } from "../lib/subscriptions/pricing";
import { expectedAmountXof } from "../lib/payments/bictorys";
import { PLAN_ENTITLEMENTS } from "../lib/subscriptions/entitlements";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}${cond || detail === undefined ? "" : "  → " + JSON.stringify(detail)}`);
}

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 7, 12);
const free: OfferContext = { now: NOW, plan: "free", paidPlan: "free", isTrial: false, trialDaysLeft: 0, periodEnd: null };
const trial: OfferContext = { ...free, plan: "pro", isTrial: true, trialDaysLeft: 5 };
const pro: OfferContext = { ...free, plan: "pro", paidPlan: "pro", periodEnd: new Date(NOW + 20 * DAY).toISOString() };
const premium: OfferContext = { ...free, plan: "premium", paidPlan: "premium", periodEnd: new Date(NOW + 20 * DAY).toISOString() };

// ---------------------------------------------------------------- Rythme
check("Gratuit, premier jour : offre de bienvenue", pickOffer(free, {}) === "welcome");
check("Gratuit, 1 jour après : rien (tous les 2 jours)", pickOffer(free, { lastShownAt: NOW - DAY, shownCount: 1, lastVariant: "welcome" }) === null);
check("Gratuit, 2 jours après : offre Pro", pickOffer(free, { lastShownAt: NOW - 2 * DAY, shownCount: 1, lastVariant: "welcome" }) === "pro");
check("Gratuit, 2 jours après une offre Pro : Premium (alternance)", pickOffer(free, { lastShownAt: NOW - 2 * DAY, shownCount: 2, lastVariant: "pro" }) === "premium");
check("Gratuit, 2 jours après Premium : de nouveau Pro", pickOffer(free, { lastShownAt: NOW - 2 * DAY, shownCount: 3, lastVariant: "premium" }) === "pro");
check("Essai, premier jour : bienvenue", pickOffer(trial, {}) === "welcome");
check("Essai, ensuite : Premium (l'étape suivante)", pickOffer(trial, { lastShownAt: NOW - 2 * DAY, shownCount: 1, lastVariant: "welcome" }) === "premium");
check("Fin d'essai (J-2) : rappel transparent", pickOffer({ ...trial, trialDaysLeft: 2 }, { lastShownAt: NOW - DAY - 1, shownCount: 3, lastVariant: "pro" }) === "trial_ending");
check("Fin d'essai : pas deux fois le même jour", pickOffer({ ...trial, trialDaysLeft: 1 }, { lastShownAt: NOW - 3_600_000, shownCount: 4 }) === null);
check("Abonné Pro : rien avant 3 jours", pickOffer(pro, { lastShownAt: NOW - 2 * DAY, shownCount: 1 }) === null);
check("Abonné Pro : Premium tous les 3 jours", pickOffer(pro, { lastShownAt: NOW - 3 * DAY, shownCount: 1 }) === "premium");
check("Abonné Premium : aucune offre", pickOffer(premium, {}) === null);
check(
  "Fin de période payée (J-3) : rappel de renouvellement",
  pickOffer({ ...premium, periodEnd: new Date(NOW + 2 * DAY).toISOString() }, { lastShownAt: NOW - 2 * DAY }) === "renew"
);
check(
  "Fin de période : une fois par jour seulement",
  pickOffer({ ...pro, periodEnd: new Date(NOW + DAY).toISOString() }, { lastShownAt: NOW - 3_600_000 }) === null
);

// ---------------------------------------------------------------- Pages protégées
check("Jamais sur une page de création", isOfferBlockedPath("/activities/new"));
check("Jamais sur une page de modification", isOfferBlockedPath("/tasks/abc/edit"));
check("Jamais pendant la configuration du compte", isOfferBlockedPath("/onboarding"));
check("Jamais sur la page des abonnements", isOfferBlockedPath("/settings", "tab=subscription"));
check("Possible sur le tableau de bord", !isOfferBlockedPath("/dashboard"));
check("Possible sur les autres paramètres", !isOfferBlockedPath("/settings", "tab=profile"));

// ---------------------------------------------------------------- Paiement anticipé
const now = new Date("2026-11-07T10:00:00Z");
const early = computePaidPeriod({ plan: "pro", status: "active", current_period_end: "2026-11-20T10:00:00Z" }, "pro", "monthly", now);
check("Paiement anticipé du même forfait : la période s'ajoute à la suite", early.extended && early.end.toISOString().startsWith("2026-12-20"), early.end.toISOString());
const expired = computePaidPeriod({ plan: "pro", status: "active", current_period_end: "2026-11-01T10:00:00Z" }, "pro", "monthly", now);
check("Forfait expiré : nouvelle période à partir d'aujourd'hui", !expired.extended && expired.end.toISOString().startsWith("2026-12-07"), expired.end.toISOString());
const upgrade = computePaidPeriod({ plan: "pro", status: "active", current_period_end: "2026-11-20T10:00:00Z" }, "premium", "yearly", now);
check("Changement de forfait : Premium commence aujourd'hui, pour 1 an", !upgrade.extended && upgrade.end.toISOString().startsWith("2027-11-07"), upgrade.end.toISOString());
const first = computePaidPeriod(null, "pro", "yearly", now);
check("Première souscription annuelle : 1 an à partir d'aujourd'hui", first.end.toISOString().startsWith("2027-11-07"));

// ---------------------------------------------------------------- Prix
check("Prix affichés en dollars : Pro $9, Premium $19", formatUsd(PLAN_ENTITLEMENTS.pro.priceMonthly) === "$9" && formatUsd(PLAN_ENTITLEMENTS.premium.priceMonthly) === "$19");
check("Annuel en dollars : $90 et $190", formatUsd(PLAN_ENTITLEMENTS.pro.priceYearly) === "$90" && formatUsd(PLAN_ENTITLEMENTS.premium.priceYearly) === "$190");
check("Montants prélevés en FCFA inchangés", PLAN_PRICES_XOF.pro.monthly === 5900 && PLAN_PRICES_XOF.premium.yearly === 125000);
check("Format FCFA lisible", formatXof(12500) === "12 500 FCFA");

// ---------------------------------------------------------------- Offre de bienvenue (1er mois)
check("1er mois affiché : Pro $4, Premium $9", FIRST_MONTH_PRICE_USD.pro === 4 && FIRST_MONTH_PRICE_USD.premium === 9);
check("Nouveau compte (aucune ligne) : éligible", isFirstMonthEligible(null));
check("Essai ou forfait gratuit : éligible", isFirstMonthEligible({ provider: "manual", provider_subscription_id: null }));
check("Mode démo (sans paiement réel) : éligible", isFirstMonthEligible({ provider: "demo", provider_subscription_id: null }));
check("Déjà payé via Bictorys : plus éligible", !isFirstMonthEligible({ provider: "bictorys", provider_subscription_id: "ch_1" }));
check("Charge enregistrée : plus éligible", !isFirstMonthEligible({ provider: null, provider_subscription_id: "ch_1" }));
check("Prélèvement 1er mois : 2 600 et 5 900 FCFA", checkoutAmountXof("pro", "monthly", true) === 2600 && checkoutAmountXof("premium", "monthly", true) === 5900);
check("Sans offre : prix normal mensuel", checkoutAmountXof("pro", "monthly", false) === 5900 && checkoutAmountXof("premium", "monthly", false) === 12500);
check("Annuel : jamais de remise du 1er mois", checkoutAmountXof("pro", "yearly", true) === 59000 && checkoutAmountXof("premium", "yearly", true) === 125000);
check("Webhook : montant attendu réduit seulement si éligible", expectedAmountXof("pro", "monthly", true) === 2600 && expectedAmountXof("pro", "monthly", false) === 5900);
check("Webhook : périodicité inconnue refusée", expectedAmountXof("pro", "weekly", true) === null && expectedAmountXof("free", "monthly", true) === null);

console.log(`\n${ok}/${total} tests réussis`);
if (ok !== total) process.exit(1);
