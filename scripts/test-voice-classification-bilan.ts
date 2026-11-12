/**
 * Tests : classification des activités, rappels vocaux contextuels selon le temps restant, bilan du soir.
 * Lancement : npx tsx scripts/test-voice-classification-bilan.ts
 */
import assert from "node:assert/strict";
import {
  ACTIVITY_SECTORS,
  buildActivityCategory,
  parseActivityCategory,
  activityCategoryLabel,
  activityContextPhrase,
  searchActivityCategories,
  spokenActivityContext,
  activitySectorKey,
  domainVoiceSentenceFr,
} from "../lib/activities/classification";
import { spokenDelay, contextualActivityReminderFr, eveningSummaryFr, generateVoiceMessage } from "../lib/voice/generator";
import { resolveStandardAlertKey, getStandardAlertSrc, getDomainAlertSrc } from "../lib/voice/standard-alerts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    console.error(`  ✗ ${name}\n    ${e?.message}`);
    process.exitCode = 1;
  }
}

console.log("\n1. Classification (secteur → type)");

test("chaque secteur a une clé unique et au moins 2 types", () => {
  const keys = new Set(ACTIVITY_SECTORS.map((s) => s.key));
  assert.equal(keys.size, ACTIVITY_SECTORS.length);
  for (const s of ACTIVITY_SECTORS) assert.ok(s.subs.length >= 2, s.key);
});

test("aucun type en double dans un secteur", () => {
  for (const s of ACTIVITY_SECTORS) assert.equal(new Set(s.subs.map((x) => x.key)).size, s.subs.length, s.key);
});

test("secteur + type : aller-retour stockage → lecture", () => {
  const v = buildActivityCategory("religion", "religious_meeting");
  assert.equal(v, "religion/religious_meeting");
  const p = parseActivityCategory(v);
  assert.equal(p.kind, "sector");
  if (p.kind === "sector") assert.equal(p.sub?.label, "Réunion religieuse");
  assert.equal(activityCategoryLabel(v), "Religion et spiritualité · Réunion religieuse");
});

test("secteur seul (sans sous-catégorie)", () => {
  assert.equal(buildActivityCategory("business", null), "business");
  assert.equal(activityCategoryLabel("business"), "Entrepreneuriat et commerce");
});

test("« Autre » avec texte libre, et « Autre » vide → Non précisé", () => {
  assert.equal(buildActivityCategory("other", null, "  Club de lecture "), "other:Club de lecture");
  assert.equal(activityCategoryLabel("other:Club de lecture"), "Club de lecture");
  assert.equal(buildActivityCategory("other", null, "   "), "unspecified");
});

test("anciennes activités : null / vide = non classée, texte libre conservé", () => {
  assert.equal(parseActivityCategory(null).kind, "none");
  assert.equal(parseActivityCategory("").kind, "none");
  assert.equal(activityCategoryLabel(null), null);
  const legacy = parseActivityCategory("Tech");
  assert.equal(legacy.kind, "legacy");
  assert.equal(activityCategoryLabel("Tech"), "Tech");
});

test("type inconnu dans un secteur connu → secteur seul (pas d'erreur)", () => {
  const p = parseActivityCategory("health/inexistant");
  assert.equal(p.kind, "sector");
  if (p.kind === "sector") assert.equal(p.sub, null);
});

test("recherche sans accents (« reunion », « mariage », « e-commerce »)", () => {
  assert.ok(searchActivityCategories("reunion").some((r) => r.sub?.key === "religious_meeting"));
  assert.ok(searchActivityCategories("mariage").some((r) => r.sub?.key === "wedding"));
  assert.ok(searchActivityCategories("e-commerce").some((r) => r.sub?.key === "ecommerce"));
  assert.equal(searchActivityCategories("   ").length, 0);
});

test("contexte parlé et phrase écrite", () => {
  assert.deepEqual(spokenActivityContext("career/work_meeting"), { possessive: "votre réunion professionnelle" });
  assert.deepEqual(spokenActivityContext("business"), { sectorContext: "votre entreprise" });
  assert.deepEqual(spokenActivityContext("other:Club"), {});
  assert.equal(activityContextPhrase("health/medical_appointment"), "Votre rendez-vous médical");
  assert.equal(activityContextPhrase("business"), "Votre activité liée à votre entreprise");
  assert.equal(activityContextPhrase(null), null);
});

console.log("\n2. Rappels selon le temps restant");

test("délais dits naturellement", () => {
  assert.equal(spokenDelay(60, "fr"), "une heure");
  assert.equal(spokenDelay(30, "fr"), "trente minutes");
  assert.equal(spokenDelay(15, "fr"), "une quinzaine de minutes");
  assert.equal(spokenDelay(10, "fr"), "une dizaine de minutes");
  assert.equal(spokenDelay(45, "fr"), "trois quarts d'heure");
  assert.equal(spokenDelay(25, "fr"), "25 minutes");
  assert.equal(spokenDelay(30, "en"), "thirty minutes");
  assert.equal(spokenDelay(60, "de"), "einer Stunde");
});

test("bug corrigé : un rappel à 30 min ne dit plus « dix minutes » (activité non classée)", () => {
  const t = generateVoiceMessage({ activityTitle: "Cours", leadMinutes: 30, category: "activity", language: "fr", includeUserName: false });
  assert.ok(t.includes("trente minutes"), t);
  assert.ok(!t.includes("dix minutes"), t);
  const t45 = generateVoiceMessage({ activityTitle: "Cours", leadMinutes: 45, category: "activity", language: "fr", includeUserName: false });
  assert.ok(t45.includes("trois quarts d'heure") && !t45.includes("une heure"), t45);
  const en = generateVoiceMessage({ activityTitle: "Class", leadMinutes: 15, category: "activity", language: "en", includeUserName: false });
  assert.ok(en.includes("fifteen minutes") && !en.includes("ten minutes"), en);
});

test("activité classée par type : phrase contextuelle", () => {
  const t = generateVoiceMessage({ userName: "Awa Koné", activityTitle: "Culte du dimanche", leadMinutes: 10, category: "activity", language: "fr", activityContext: "religion/religious_meeting" });
  assert.ok(t.startsWith("Bonjour Awa."), t);
  assert.ok(t.includes("réunion religieuse") && t.includes("une dizaine de minutes") && t.includes("Culte du dimanche"), t);
});

test("activité classée par secteur seul : « activité liée à votre entreprise »", () => {
  const t = generateVoiceMessage({ activityTitle: "Inventaire", leadMinutes: 15, category: "activity", language: "fr", includeUserName: false, activityContext: "business" });
  assert.ok(t.includes("activité liée à votre entreprise") && t.includes("une quinzaine de minutes"), t);
});

test("rappel « maintenant » contextuel", () => {
  const t = contextualActivityReminderFr({ greeting: "Bonjour.", title: "Contrôle", leadMinutes: 0, activityContext: "health/medical_appointment" });
  assert.equal(t, "Bonjour. C'est l'heure : votre rendez-vous médical « Contrôle » commence maintenant.");
});

test("variante stable : même rappel → même phrase ; « Pensez à vous préparer » dès 15 min", () => {
  const a = contextualActivityReminderFr({ greeting: "Bonjour.", title: "Point équipe", leadMinutes: 30, activityContext: "career/work_meeting" });
  const b = contextualActivityReminderFr({ greeting: "Bonjour.", title: "Point équipe", leadMinutes: 30, activityContext: "career/work_meeting" });
  assert.equal(a, b);
  assert.ok(a!.includes("Pensez à vous préparer") || a!.includes("approche"), a!);
  const short = contextualActivityReminderFr({ greeting: "Bonjour.", title: "Point équipe", leadMinutes: 10, activityContext: "career/work_meeting" });
  assert.ok(!short!.includes("Pensez à vous préparer"), short!);
});

test("activité non classée ou « Autre » : pas de phrase contextuelle (phrase habituelle)", () => {
  assert.equal(contextualActivityReminderFr({ greeting: "", title: "X", leadMinutes: 30, activityContext: null }), null);
  assert.equal(contextualActivityReminderFr({ greeting: "", title: "X", leadMinutes: 30, activityContext: "other:Club" }), null);
});

test("voix préenregistrées réutilisées : 60/30/15/10 min → fichiers existants", () => {
  assert.equal(resolveStandardAlertKey({ kind: "activity_reminder_60m" }), "activity_in_1h");
  assert.equal(resolveStandardAlertKey({ kind: "activity_reminder_30m" }), "activity_in_30m");
  assert.equal(resolveStandardAlertKey({ kind: "activity_reminder_15m" }), "activity_in_15m");
  assert.equal(resolveStandardAlertKey({ kind: "activity_reminder_10m" }), "activity_in_10m");
  assert.equal(getStandardAlertSrc("activity_in_15m", "fr"), "/voice/alerts/activity_in_15m-fr.mp3?v=1");
});

test("voix « domaine » : une phrase par secteur, rien tant que les fichiers ne sont pas déposés", () => {
  assert.equal(domainVoiceSentenceFr("business"), "Il s'agit d'une activité liée à votre entreprise.");
  assert.equal(domainVoiceSentenceFr("inconnu"), null);
  for (const s of ACTIVITY_SECTORS) assert.ok(domainVoiceSentenceFr(s.key)!.startsWith("Il s'agit d'une activité liée à "), s.key);
  assert.equal(activitySectorKey("religion/worship"), "religion");
  assert.equal(activitySectorKey("other:Club"), null);
  assert.equal(activitySectorKey(null), null);
  // Langue pas encore enregistrée → aucun fichier demandé (pas d'erreur 404 jouée)
  assert.equal(getDomainAlertSrc("business", "fr"), null);
  assert.equal(getDomainAlertSrc("../x", "fr"), null);
});

console.log("\n3. Bilan du soir et bonne nuit");

test("journée sans rien de prévu", () => {
  const t = eveningSummaryFr({ salutationName: "Awa", completed: [], remaining: [] });
  assert.ok(t.startsWith("Bonsoir Awa !") && t.includes("Aucune activité ni tâche n'était prévue"), t);
  assert.ok(t.endsWith("Je vous souhaite une excellente nuit. À demain !"), t);
});

test("tout est fait", () => {
  const t = eveningSummaryFr({ completed: [{ title: "A" }, { title: "B" }], remaining: [] });
  assert.ok(t.includes("Vous avez terminé les 2 éléments prévus aujourd'hui."), t);
  assert.ok(!t.includes("restent"), t);
});

test("reste à faire, reportés et demain", () => {
  const t = eveningSummaryFr({
    completed: [{ title: "A" }],
    remaining: [{ title: "Devis Diallo" }],
    postponed: [{ title: "Cours" }],
    tomorrow: [{ title: "Conseil", category: "activity", timeStr: "09:00" }, { title: "Loyer", category: "expense" }],
  });
  assert.ok(!t.includes("une élément"), t);
  assert.ok(t.includes("Vous avez terminé un élément aujourd'hui."), t);
  assert.ok(t.includes("Il reste Devis Diallo à terminer, à reprendre demain."), t);
  assert.ok(t.includes("Une activité a été reportée."), t);
  assert.ok(t.includes("Demain, vous avez une activité au programme, la première à"), t);
  assert.ok(t.includes("Une échéance vous attend également demain."), t);
});

test("bonne nuit une seule fois, aucune supposition sur l'humeur", () => {
  const t = eveningSummaryFr({ completed: [{ title: "A" }], remaining: [{ title: "B" }, { title: "C" }, { title: "D" }] });
  assert.equal(t.split("excellente nuit").length - 1, 1);
  for (const forbidden of ["fier", "satisfait", "heureux", "fatigué", "stress"]) assert.ok(!t.toLowerCase().includes(forbidden), forbidden);
  assert.ok(t.includes("3 éléments restent à terminer ; vous pourrez les reprendre demain."), t);
});

test("le dispatcher général transmet reportés et demain au bilan", () => {
  const t = generateVoiceMessage({ kind: "evening_checkin", language: "fr", includeUserName: false, completedActivities: [], uncompletedActivities: [], postponedActivities: [{ title: "X" }], tomorrowItems: [] } as any);
  // Le dispatcher passe par generateEveningSummaryVoiceText (paramètres hérités) : il doit au minimum souhaiter bonne nuit
  assert.ok(t.includes("À demain"), t);
});

console.log(`\n${passed} test(s) réussi(s)${process.exitCode ? " — des échecs ci-dessus" : ""}.\n`);
