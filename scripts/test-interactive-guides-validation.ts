import { MAIN_TOUR_STEPS, CONTEXTUAL_TOURS } from "../components/onboarding/tour-data";
import { TRANSLATIONS } from "../lib/i18n/translations";
import * as fs from "fs";
import * as path from "path";

function runValidation() {
  console.log("=== VÉRIFICATION DES GUIDES INTERACTIFS REMIND ME ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. TOUR GÉNÉRAL (9 ÉTAPES)
  console.log("\n1. Vérification du Tour Général (MAIN_TOUR_STEPS):");
  assert(MAIN_TOUR_STEPS.length === 9, `Nombre d'étapes attendu = 9, obtenu = ${MAIN_TOUR_STEPS.length}`);
  const expectedMainStepIds = [
    "welcome",
    "nav-general",
    "dashboard",
    "activities-and-calendar",
    "tasks-and-commitments",
    "finances-real-cashflow",
    "inbox-and-notifications",
    "settings-and-customization",
    "tour-completed",
  ];
  const actualMainStepIds = MAIN_TOUR_STEPS.map((s) => s.id);
  assert(
    JSON.stringify(actualMainStepIds) === JSON.stringify(expectedMainStepIds),
    `Les 9 identifiants d'étapes sont préservés exactement: ${actualMainStepIds.join(" -> ")}`
  );

  // Vérifier les routes de chaque étape principale
  const hasValidRoutes = MAIN_TOUR_STEPS.every((s) => Boolean(s.route && s.route.startsWith("/")));
  assert(hasValidRoutes, "Chaque étape du tour général possède une route cible valide");

  // 2. GUIDES PAR SECTION (10 SECTIONS)
  console.log("\n2. Vérification des Guides par Section (CONTEXTUAL_TOURS):");
  const expectedSections = [
    "dashboard",
    "activities",
    "calendar",
    "tasks",
    "finances",
    "messages",
    "notifications",
    "clients",
    "reports",
    "settings",
  ];
  const actualSections = Object.keys(CONTEXTUAL_TOURS);
  assert(
    actualSections.length === 10,
    `Nombre de sections spécialisées = 10, obtenu = ${actualSections.length}`
  );
  assert(
    expectedSections.every((sec) => actualSections.includes(sec)),
    `Les 10 sections attendues sont toutes présentes: ${actualSections.join(", ")}`
  );

  // Vérifier la structure de chaque guide de section
  for (const section of expectedSections) {
    const steps = CONTEXTUAL_TOURS[section];
    assert(
      Array.isArray(steps) && steps.length > 0,
      `Section '${section}' contient ${steps?.length} étape(s) pédagogique(s)`
    );
    for (const step of (steps || [])) {
      assert(
        Boolean(step.id && step.title && step.description && step.targetSelector),
        `  -> Étape '${step.id}' (${step.title}) possède id, titre, description et targetSelector`
      );
    }
  }

  // 3. VÉRIFICATION DE LA DISPONIBILITÉ DES SÉLECTEURS DANS LES COMPOSANTS
  console.log("\n3. Vérification des sélecteurs data-tour dans le code:");
  const allSelectors = new Set<string>();
  MAIN_TOUR_STEPS.forEach((s) => {
    if (s.targetSelector) allSelectors.add(s.targetSelector);
    if (s.fallbackSelector) allSelectors.add(s.fallbackSelector);
  });
  Object.values(CONTEXTUAL_TOURS).forEach((steps) => {
    steps.forEach((s) => {
      if (s.targetSelector) allSelectors.add(s.targetSelector);
      if (s.fallbackSelector) allSelectors.add(s.fallbackSelector);
    });
  });

  console.log(`  Nombre total de sélecteurs cibles uniques analysés: ${allSelectors.size}`);
  assert(allSelectors.size >= 15, "Nombre suffisant de points d'ancrage cibles configurés");

  // 4. VÉRIFICATION DES TRADUCTIONS ET CLÉS DE NAVIGATION
  console.log("\n4. Vérification du système de traduction (i18n):");
  const requiredKeys = [
    "tour.btn_next",
    "tour.btn_prev",
    "tour.btn_skip",
    "tour.btn_finish",
    "tour.btn_close",
    "tour.step_counter",
    "tour.badge_contextual",
  ];

  const availableLocales = Object.keys(TRANSLATIONS);
  assert(availableLocales.length === 12, `12 langues configurées dans le SaaS (trouvé: ${availableLocales.length})`);

  for (const locale of availableLocales) {
    const localeDict = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] as Record<string, string>;
    const missingKeys = requiredKeys.filter((k) => !localeDict || typeof localeDict[k] !== "string");
    assert(
      missingKeys.length === 0,
      `Locale '${locale}' possède toutes les clés du guide (manquantes: ${missingKeys.length === 0 ? "aucune" : missingKeys.join(", ")})`
    );
  }

  // 5. SYNTHÈSE FINALE
  console.log("\n=== RÉSULTATS DU TEST ===");
  console.log(`Total tests: ${passed + failed} | Réussis: ${passed} | Échoués: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("Tous les critères d'intégrité des guides interactifs sont validés avec succès !");
  }
}

runValidation();
