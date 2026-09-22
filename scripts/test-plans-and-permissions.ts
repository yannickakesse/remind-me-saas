import {
  PLAN_ENTITLEMENTS,
  normalizePlan,
  getPlanEntitlements,
  isFeatureAllowed,
  type PlanType,
} from "../lib/subscriptions/entitlements";
import {
  assertCanCreateActivity,
  assertCanCreateContact,
  assertCanCreateBudget,
  assertCanCreateSavingsGoal,
  assertFeatureAllowed,
} from "../lib/subscriptions/server";

// Mock Supabase Client generator
function createMockSupabase(plan: PlanType, counts: { activities?: number; contacts?: number; orgs?: number; budgets?: number; goals?: number }) {
  return {
    from(table: string) {
      return {
        select(cols: string, opts?: { count?: string; head?: boolean }) {
          return {
            eq(col: string, val: any) {
              if (table === "subscriptions") {
                return {
                  maybeSingle: async () => ({
                    data: { plan, status: "active", current_period_end: null },
                    error: null,
                  }),
                };
              }

              let count = 0;
              if (table === "activities") count = counts.activities ?? 0;
              if (table === "contacts") count = counts.contacts ?? 0;
              if (table === "organizations") count = counts.orgs ?? 0;
              if (table === "budgets") count = counts.budgets ?? 0;
              if (table === "savings_goals") count = counts.goals ?? 0;

              return {
                count,
                data: null,
                error: null,
              };
            },
          };
        },
      };
    },
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user-123", user_metadata: { subscription_plan: plan } } } }),
    },
  } as any;
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("🚀 Lancement de la suite de tests Plans, Limites & Permissions");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // TEST 1: Source centrale de vérité & Entitlements
  // ----------------------------------------------------------------------------
  console.log("--- 1. Matrice des plans et quotas théoriques ---");
  const free = PLAN_ENTITLEMENTS.free;
  assert(free.maxActivities === 3, "Free: maxActivities === 3");
  assert(free.maxClients === 5, "Free: maxClients === 5");
  assert(free.maxGoals === 2, "Free: maxGoals === 2");
  assert(free.maxBudgets === 3, "Free: maxBudgets === 3");
  assert(free.hourlyProfitability === false, "Free: hourlyProfitability === false");
  assert(free.multiCurrency === false, "Free: multiCurrency === false");
  assert(free.aiAssistant === false, "Free: aiAssistant === false");

  const pro = PLAN_ENTITLEMENTS.pro;
  assert(pro.maxActivities === 15, "Pro: maxActivities === 15");
  assert(pro.maxClients === 50, "Pro: maxClients === 50");
  assert(pro.maxGoals === 10, "Pro: maxGoals === 10");
  assert(pro.maxBudgets === 15, "Pro: maxBudgets === 15");
  assert(pro.hourlyProfitability === true, "Pro: hourlyProfitability === true");
  assert(pro.multiCurrency === true, "Pro: multiCurrency === true");
  assert(pro.aiAssistant === false, "Pro: aiAssistant === false");

  const premium = PLAN_ENTITLEMENTS.premium;
  assert(premium.maxActivities === Infinity, "Premium: maxActivities === Infinity");
  assert(premium.maxClients === Infinity, "Premium: maxClients === Infinity");
  assert(premium.maxGoals === Infinity, "Premium: maxGoals === Infinity");
  assert(premium.maxBudgets === Infinity, "Premium: maxBudgets === Infinity");
  assert(premium.hourlyProfitability === true, "Premium: hourlyProfitability === true");
  assert(premium.multiCurrency === true, "Premium: multiCurrency === true");
  assert(premium.aiAssistant === true, "Premium: aiAssistant === true");

  // ----------------------------------------------------------------------------
  // TEST 2: Limites et blocage - Plan FREE
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Vérification des blocages - Plan FREE ---");
  const freeClientUnder = createMockSupabase("free", { activities: 2, contacts: 3, orgs: 1, budgets: 2, goals: 1 });
  let freeUnderOk = true;
  try {
    await assertCanCreateActivity(freeClientUnder, "test-user-123");
    await assertCanCreateContact(freeClientUnder, "test-user-123");
    await assertCanCreateBudget(freeClientUnder, "test-user-123");
    await assertCanCreateSavingsGoal(freeClientUnder, "test-user-123");
  } catch {
    freeUnderOk = false;
  }
  assert(freeUnderOk, "Free sous quota : créations autorisées");

  const freeClientAtLimit = createMockSupabase("free", { activities: 3, contacts: 3, orgs: 2, budgets: 3, goals: 2 });
  
  let act4Refused = false;
  try {
    await assertCanCreateActivity(freeClientAtLimit, "test-user-123");
  } catch (e: any) {
    act4Refused = e.message.includes("limite de votre plan Free (3 activités)");
  }
  assert(act4Refused, "Free avec 3 activités : 4e création refusée avec message explicite");

  let contact6Refused = false;
  try {
    await assertCanCreateContact(freeClientAtLimit, "test-user-123");
  } catch (e: any) {
    contact6Refused = e.message.includes("limite de votre plan Free (5 contacts & clients)");
  }
  assert(contact6Refused, "Free avec 5 contacts/clients (3 contacts + 2 orgs) : 6e création refusée");

  let budget4Refused = false;
  try {
    await assertCanCreateBudget(freeClientAtLimit, "test-user-123");
  } catch (e: any) {
    budget4Refused = e.message.includes("limite de votre plan Free (3 budgets mensuels)");
  }
  assert(budget4Refused, "Free avec 3 budgets : 4e création refusée");

  let goal3Refused = false;
  try {
    await assertCanCreateSavingsGoal(freeClientAtLimit, "test-user-123");
  } catch (e: any) {
    goal3Refused = e.message.includes("limite de votre plan Free (2 objectifs d'épargne)");
  }
  assert(goal3Refused, "Free avec 2 objectifs d'épargne : 3e création refusée");

  let freeHourlyBlocked = false;
  try {
    await assertFeatureAllowed(freeClientAtLimit, "test-user-123", "hourlyProfitability", "Rentabilité horaire");
  } catch (e: any) {
    freeHourlyBlocked = true;
  }
  assert(freeHourlyBlocked, "Free : fonctionnalité Rentabilité horaire bloquée");

  let freeAiBlocked = false;
  try {
    await assertFeatureAllowed(freeClientAtLimit, "test-user-123", "aiAssistant", "Assistant IA");
  } catch (e: any) {
    freeAiBlocked = true;
  }
  assert(freeAiBlocked, "Free : fonctionnalité Assistant IA bloquée");

  // ----------------------------------------------------------------------------
  // TEST 3: Limites et fonctionnalités - Plan PRO
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Vérification des droits et limites - Plan PRO ---");
  const proClientAtLimit = createMockSupabase("pro", { activities: 15, contacts: 40, orgs: 10, budgets: 15, goals: 10 });

  let proAct16Refused = false;
  try {
    await assertCanCreateActivity(proClientAtLimit, "test-user-123");
  } catch (e: any) {
    proAct16Refused = e.message.includes("limite de votre plan Pro (15 activités)");
  }
  assert(proAct16Refused, "Pro avec 15 activités : 16e création refusée avec message d'upgrade Premium");

  let proContact51Refused = false;
  try {
    await assertCanCreateContact(proClientAtLimit, "test-user-123");
  } catch (e: any) {
    proContact51Refused = e.message.includes("limite de votre plan Pro (50 contacts & clients)");
  }
  assert(proContact51Refused, "Pro avec 50 contacts/clients : 51e création refusée");

  let proHourlyAllowed = true;
  try {
    await assertFeatureAllowed(proClientAtLimit, "test-user-123", "hourlyProfitability", "Rentabilité horaire");
  } catch {
    proHourlyAllowed = false;
  }
  assert(proHourlyAllowed, "Pro : fonctionnalité Rentabilité horaire autorisée");

  let proMultiCurrencyAllowed = true;
  try {
    await assertFeatureAllowed(proClientAtLimit, "test-user-123", "multiCurrency", "Multi-devises");
  } catch {
    proMultiCurrencyAllowed = false;
  }
  assert(proMultiCurrencyAllowed, "Pro : fonctionnalité Multi-devises unifié autorisée");

  let proAiBlocked = false;
  try {
    await assertFeatureAllowed(proClientAtLimit, "test-user-123", "aiAssistant", "Assistant IA");
  } catch {
    proAiBlocked = true;
  }
  assert(proAiBlocked, "Pro : fonctionnalité Assistant IA bloquée");

  // ----------------------------------------------------------------------------
  // TEST 4: Plan PREMIUM - Illimité
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Vérification Plan PREMIUM (Illimité) ---");
  const premiumClient = createMockSupabase("premium", { activities: 100, contacts: 500, orgs: 100, budgets: 80, goals: 50 });

  let premiumAllOk = true;
  try {
    await assertCanCreateActivity(premiumClient, "test-user-123");
    await assertCanCreateContact(premiumClient, "test-user-123");
    await assertCanCreateBudget(premiumClient, "test-user-123");
    await assertCanCreateSavingsGoal(premiumClient, "test-user-123");
    await assertFeatureAllowed(premiumClient, "test-user-123", "hourlyProfitability", "Rentabilité horaire");
    await assertFeatureAllowed(premiumClient, "test-user-123", "multiCurrency", "Multi-devises");
    await assertFeatureAllowed(premiumClient, "test-user-123", "aiAssistant", "Assistant IA");
  } catch (err: any) {
    premiumAllOk = false;
    console.error(err);
  }
  assert(premiumAllOk, "Premium : 100 activités, 600 clients, rentabilité, devises et IA 100% autorisés");

  // ----------------------------------------------------------------------------
  // TEST 5: Downgrade sans suppression de données
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Sécurité Downgrade (Conservation des données) ---");
  // Utilisateur Premium avec 20 activités qui repasse en Pro (max 15)
  const downgradedToProClient = createMockSupabase("pro", { activities: 20, contacts: 60, orgs: 5, budgets: 18, goals: 12 });

  let downgradeNoticeReturned = false;
  try {
    await assertCanCreateActivity(downgradedToProClient, "test-user-123");
  } catch (e: any) {
    downgradeNoticeReturned = e.message.includes("Vos données existantes restent conservées");
  }
  assert(
    downgradeNoticeReturned,
    "Downgrade Premium -> Pro avec 20 activités : nouvelle création bloquée avec message confirmant la conservation des données existantes"
  );

  // ----------------------------------------------------------------------------
  // TEST 6: Normalisation et résilience du plan
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Normalisation des valeurs de plans ---");
  assert(normalizePlan("PRO") === "pro", "Normalisation 'PRO' -> 'pro'");
  assert(normalizePlan("  premium  ") === "premium", "Normalisation '  premium  ' -> 'premium'");
  assert(normalizePlan("unknown_plan") === "free", "Normalisation 'unknown_plan' -> 'free'");
  assert(normalizePlan(null) === "free", "Normalisation null -> 'free'");

  console.log("\n==================================================================");
  console.log(`📊 Résultat Final : ${passedTests} tests réussis, ${failedTests} échecs.`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
