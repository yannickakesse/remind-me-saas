/**
 * ==============================================================================
 * 🧪 REMIND ME — TEST CIBLÉ : PERSONNALISATION VOCALE & INTÉGRITÉ
 * ==============================================================================
 */

import {
  extractFirstName,
  formatSalutationName,
  generateVoiceMessage,
  DEFAULT_VOICE_SETTINGS,
} from "../lib/voice";

let passedCount = 0;
let totalCount = 0;

function check(title: string, condition: boolean, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    console.error(`  ❌ [FAIL] ${title} -> ${detail ?? "Condition non satisfaite"}`);
  }
}

console.log("==================================================================");
console.log("🧪 TEST CIBLÉ : PERSONNALISATION VOCALE, CONFIDENTIALITÉ & PRÉNOM");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// 1. EXTRACTION DU PRÉNOM ET GESTION DU TITRE / PRÉFIXE
// -----------------------------------------------------------------------------
console.log("1️⃣ Extraction du prénom & salutations naturelles :");

check(
  "Nom standard 'Yannick Akesse' extrait bien 'Yannick'",
  extractFirstName("Yannick Akesse") === "Yannick"
);

check(
  "Nom avec civilité 'Monsieur Yannick' extrait bien 'Yannick'",
  extractFirstName("Monsieur Yannick") === "Yannick"
);

check(
  "Nom avec civilité 'Dr. Jean Dupont' extrait bien 'Jean'",
  extractFirstName("Dr. Jean Dupont") === "Jean"
);

check(
  "Nom vide ou null renvoie une chaîne vide sans erreur",
  extractFirstName(null) === "" && extractFirstName("") === "" && extractFirstName("   ") === ""
);

check(
  "includeUserName = false désactive complètement le nom",
  formatSalutationName("Yannick", "fr", false) === ""
);

check(
  "includeUserName = true formate correctement en français",
  formatSalutationName("Yannick Akesse", "fr", true) === "Monsieur Yannick"
);

check(
  "includeUserName = true formate correctement en anglais",
  formatSalutationName("Yannick Akesse", "en", true) === "Mr. Yannick"
);

// -----------------------------------------------------------------------------
// 2. CONFIDENTIALITÉ FINANCIÈRE (MASQUAGE DES MONTANTS)
// -----------------------------------------------------------------------------
console.log("\n2️⃣ Confidentialité financière (Masquage des montants) :");

const msgFrHiddenPayment = generateVoiceMessage({
  userName: "Yannick",
  activityTitle: "Mission Conseil",
  category: "payment",
  amount: 500000,
  currency: "FCFA",
  daysDiff: 3,
  language: "fr",
  hideAmount: true,
  includeUserName: true,
});

check(
  "En français, un paiement masqué ne mentionne PAS le montant (500000)",
  !msgFrHiddenPayment.includes("500000") && !msgFrHiddenPayment.includes("FCFA") && msgFrHiddenPayment.includes("paiement en attente")
);

const msgFrExposedPayment = generateVoiceMessage({
  userName: "Yannick",
  activityTitle: "Mission Conseil",
  category: "payment",
  amount: 500000,
  currency: "FCFA",
  daysDiff: 3,
  language: "fr",
  hideAmount: false,
  includeUserName: true,
});

check(
  "En français, un paiement non masqué mentionne bien le montant et le prénom",
  msgFrExposedPayment.includes("500000 FCFA") && msgFrExposedPayment.includes("Monsieur Yannick")
);

const msgEnHiddenPayment = generateVoiceMessage({
  userName: "Yannick",
  activityTitle: "Consulting",
  category: "payment",
  amount: 1500,
  currency: "EUR",
  daysDiff: 0,
  language: "en",
  hideAmount: true,
  includeUserName: true,
});

check(
  "En anglais, un paiement masqué ne mentionne PAS le montant (1500)",
  !msgEnHiddenPayment.includes("1500") && msgEnHiddenPayment.includes("scheduled date for a payment")
);

const msgFrHiddenExpense = generateVoiceMessage({
  userName: "Yannick",
  activityTitle: "Abonnement Internet",
  category: "expense",
  amount: 25000,
  currency: "FCFA",
  language: "fr",
  hideAmount: true,
  includeUserName: true,
});

check(
  "En français, une dépense masquée ne mentionne PAS le montant (25000)",
  !msgFrHiddenExpense.includes("25000") && msgFrHiddenExpense.includes("Rappel pour votre dépense : Abonnement Internet")
);

// -----------------------------------------------------------------------------
// 3. PONCTUATION LORSQUE LE PRÉNOM EST ABSENT OU DÉSACTIVÉ
// -----------------------------------------------------------------------------
console.log("\n3️⃣ Ponctuation propre lorsque le prénom est absent ou désactivé :");

const msgNoUser = generateVoiceMessage({
  userName: null,
  activityTitle: "Consultation Médicale",
  timeStr: "14:00",
  category: "activity",
  leadMinutes: 10,
  language: "fr",
  includeUserName: false,
});

check(
  "Rappel sans prénom commence par 'Bonjour.' sans espace orphelin ni virgule bizarre",
  msgNoUser.startsWith("Bonjour. Votre séance avec \"Consultation Médicale\"")
);

const msgWithUser = generateVoiceMessage({
  userName: "Yannick",
  activityTitle: "Consultation Médicale",
  timeStr: "14:00",
  category: "activity",
  leadMinutes: 10,
  language: "fr",
  includeUserName: true,
});

check(
  "Rappel avec prénom commence par 'Bonjour Monsieur Yannick.'",
  msgWithUser.startsWith("Bonjour Monsieur Yannick. Votre séance avec \"Consultation Médicale\"")
);

// -----------------------------------------------------------------------------
// 4. DISTINCTION TEXTE PERSONNALISÉ VS ÉVÉNEMENTS AUTOMATIQUES
// -----------------------------------------------------------------------------
console.log("\n4️⃣ Distinction Texte personnalisé vs Événements réels :");

const customPreview = generateVoiceMessage({
  userName: "Yannick",
  kind: "custom_reminder",
  customText: "Penser à envoyer le compte rendu.",
  language: "fr",
  includeUserName: true,
});

check(
  "Texte personnalisé libre préfixe la salutation et restitue fidèlement le texte saisi",
  customPreview === "Bonjour Monsieur Yannick, Penser à envoyer le compte rendu."
);

const normalEvent = generateVoiceMessage({
  userName: "Yannick",
  activityTitle: "Séance de Sport",
  timeStr: "18:00",
  category: "activity",
  language: "fr",
  includeUserName: true,
});

check(
  "L'événement automatique ne subit pas d'interférence et produit sa phrase métier dynamique",
  normalEvent.includes("Séance de Sport") && normalEvent.includes("18 heures")
);

// -----------------------------------------------------------------------------
// 5. VALEURS PAR DÉFAUT & ROBUSTESSE DES PARAMÈTRES
// -----------------------------------------------------------------------------
console.log("\n5️⃣ Paramètres par défaut & conformité des options :");

check("Vitesse par défaut à 1.0x", DEFAULT_VOICE_SETTINGS.voice_playback_rate === 1.0);
check("Répétition par défaut à 0 (1 seule lecture)", DEFAULT_VOICE_SETTINGS.repeat_voice === 0);
check("Langue par défaut 'fr'", DEFAULT_VOICE_SETTINGS.voice_language === "fr");
check("Voix système par défaut", DEFAULT_VOICE_SETTINGS.voice_type === "system");
check("Masquage financier par défaut à false", DEFAULT_VOICE_SETTINGS.voice_hide_financial_amounts === false);
check("Inclusion du prénom par défaut à true", DEFAULT_VOICE_SETTINGS.voice_include_user_name === true);

console.log("\n==================================================================");
console.log(`📊 RÉSULTAT DU TEST : ${passedCount}/${totalCount} tests passés (${Math.round((passedCount / totalCount) * 100)}%)`);
console.log("==================================================================\n");

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
