/**
 * Revenus exceptionnels — tests du classement, des totaux et de la validation.
 * Lancer : npx tsx scripts/test-exceptional-income.ts
 */
import { incomeKindOf, splitReceivedIncome, isExceptionalType, EXCEPTIONAL_INCOME_CATEGORIES } from "../lib/finances/income-kinds";
import { incomeFormSchema } from "../lib/validation/finances";
import { deriveFinanceStatus } from "../lib/validation/finances";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}`);
}

// --- Exemple du cahier des charges : 150 000 + 35 000 + 4 000 = 189 000 ---
const month = [
  { amount: 150000, received: true, income_type: "salary", compensation_id: null },
  { amount: 35000, received: true, income_type: "contract", compensation_id: "comp-1" },
  { amount: 4000, received: true, income_type: "bonus", compensation_id: null },
];
const s1 = splitReceivedIncome(month);
check("Bonus de 4 000 inclus : total des revenus = 189 000", s1.total === 189000);
check("dont revenus exceptionnels = 4 000", s1.exceptional === 4000);
check("Aucun remboursement → revenus hors remboursements = total", s1.gains === 189000 && s1.refunds === 0);

// --- Reçu / attendu ---
const s2 = splitReceivedIncome([...month, { amount: 4000, received: false, income_type: "windfall", compensation_id: null }]);
check("Revenu exceptionnel attendu : non compté avant encaissement", s2.total === 189000 && s2.exceptional === 4000);
const s3 = splitReceivedIncome([...month.slice(0, 2), { amount: 4000, received: true, income_type: "windfall", compensation_id: null }]);
check("Une fois encaissé, il est compté (gain imprévu)", s3.total === 189000 && s3.exceptional === 4000);

// --- Remboursements : distingués, jamais présentés comme un gain ---
const s4 = splitReceivedIncome([...month.slice(0, 2), { amount: 10000, received: true, income_type: "refund", compensation_id: null }]);
check("Remboursement : compté dans les encaissements (total 195 000)", s4.total === 195000);
check("Remboursement : affiché à part (10 000), pas dans les exceptionnels", s4.refunds === 10000 && s4.exceptional === 0);
check("Revenus hors remboursements = 185 000 (aucun gain fictif)", s4.gains === 185000);
const expense = 10000;
check("Dépense 10 000 + remboursement 10 000 : solde net inchangé", s4.total - 150000 - 35000 - expense === 0);

// --- Classement ---
check("Revenu d'activité généré automatiquement → régulier", incomeKindOf({ income_type: "contract", compensation_id: "c" }) === "regular");
check("Revenu saisi à la main → ponctuel", incomeKindOf({ income_type: "freelance", compensation_id: null }) === "ponctual");
check("Bonus, gain imprévu, cadeau, autre → exceptionnel",
  ["bonus", "windfall", "gift", "exceptional_other"].every((t) => incomeKindOf({ income_type: t }) === "exceptional"));
check("Remboursement → catégorie distincte", incomeKindOf({ income_type: "refund" }) === "refund");
check("Anciens revenus (type « contract » par défaut) inchangés → ponctuels", incomeKindOf({ income_type: "contract", compensation_id: null }) === "ponctual");
check("Les 5 catégories demandées existent", EXCEPTIONAL_INCOME_CATEGORIES.length === 5 && isExceptionalType("gift"));

// --- Validation : la catégorie choisie est conservée telle quelle ---
const base = { label: "Gain imprévu", amount: "4000", currency: "XOF", dueDate: "2026-11-03" };
for (const t of ["bonus", "windfall", "gift", "refund", "exceptional_other"]) {
  const parsed = incomeFormSchema.safeParse({ ...base, incomeType: t });
  check(`Validation : « ${t} » accepté et conservé`, parsed.success && parsed.data.incomeType === t);
}
check("Validation : catégorie inconnue refusée (jamais remplacée)", !incomeFormSchema.safeParse({ ...base, incomeType: "transfer" }).success);
check("Validation : montant nul refusé", !incomeFormSchema.safeParse({ ...base, amount: "0", incomeType: "bonus" }).success);
check("Validation : provenance limitée à 160 caractères", !incomeFormSchema.safeParse({ ...base, incomeType: "gift", reference: "x".repeat(161) }).success);

// --- Dates : un revenu reçu le 3 novembre et saisi le 20 compte en novembre ---
check("Statut dérivé : reçu reste « reçu » quelle que soit la date", deriveFinanceStatus(true, "2026-11-03", "UTC") === "received");

console.log(`\n${ok}/${total} tests réussis`);
if (ok !== total) process.exit(1);
