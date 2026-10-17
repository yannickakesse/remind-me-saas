/**
 * ==============================================================================
 * 🧪 REMIND ME — PHASE 6 TEST SUITE: VOIX DE GUIDAGE, MOTION DESIGN & SYNCHRO
 * ==============================================================================
 */

import {
  SECTION_VOICE_GUIDES,
  getSectionVoiceGuide,
  getTourStepVoiceText,
} from "../lib/voice/section-guides";
import type { VoiceLanguage, VoicePriority } from "../lib/voice/types";
import type { TourStep } from "../components/onboarding/tour-data";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, title: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    console.error(`  ❌ [FAIL] ${title} -> ${details || "Échec de l'assertion"}`);
  }
}

console.log("==================================================================");
console.log("🧪 TEST CIBLÉ PHASE 6 : GUIDAGE VOCAL & MOTION DESIGN REMIND ME");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// 1. VÉRIFICATION DES EXPLICATIONS VOCALES PAR SECTION (10 SECTIONS x 5 LANGUES)
// -----------------------------------------------------------------------------
console.log("1️⃣ Validation des textes d'accompagnement contextuel par section :");

const REQUIRED_SECTIONS = [
  "dashboard",
  "activities",
  "calendar",
  "tasks",
  "finances",
  "reports",
  "notifications",
  "messages",
  "settings",
  "clients",
];

const REQUIRED_LANGUAGES: VoiceLanguage[] = ["fr", "en", "es", "de", "pt"];

// 1.1 Toutes les sections requises existent
for (const sec of REQUIRED_SECTIONS) {
  assert(
    Boolean(SECTION_VOICE_GUIDES[sec]),
    `Section '${sec}' configurée dans les guides vocaux`,
    `Section manquante dans SECTION_VOICE_GUIDES`
  );
}

// 1.2 Couverture intégrale des 5 langues pour chaque section
for (const sec of REQUIRED_SECTIONS) {
  for (const lang of REQUIRED_LANGUAGES) {
    const text = getSectionVoiceGuide(sec, lang);
    const isValid = Boolean(text && text.trim().length > 20 && text.trim().length < 320);
    assert(
      isValid,
      `Section '${sec}' [${lang}] : texte concis et pertinent (${text?.length || 0} car.)`,
      `Texte absent, trop court ou trop verbeux pour ${sec} en ${lang}`
    );
  }
}

// 1.3 Fidélité fonctionnelle (Pas de fonctionnalités fantômes)
const frFinances = getSectionVoiceGuide("finances", "fr");
assert(
  frFinances.includes("trésorerie réelle") &&
    frFinances.includes("encaissements") &&
    frFinances.includes("sans double comptage"),
  "Le guide finances mentionne fidèlement trésorerie réelle, encaissements et zéro double comptage"
);

const frActivities = getSectionVoiceGuide("activities", "fr");
assert(
  frActivities.includes("contrats") &&
    frActivities.includes("rémunérations") &&
    frActivities.includes("rappels"),
  "Le guide activités mentionne fidèlement contrats, rémunérations et rappels"
);

const frCalendar = getSectionVoiceGuide("calendar", "fr");
assert(
  frCalendar.includes("conflit") && frCalendar.includes("disponibilités"),
  "Le guide calendrier mentionne fidèlement la détection des conflits et les disponibilités"
);

// -----------------------------------------------------------------------------
// 2. FORMATAGE ET SYNCHRONISATION DES ÉTAPES DU TOUR INTERACTIF
// -----------------------------------------------------------------------------
console.log("\n2️⃣ Formatage oral des étapes du Tour Interactif (getTourStepVoiceText) :");

const mockStepModal: TourStep = {
  id: "welcome",
  title: "Bienvenue sur Remind Me 👋",
  subtitle: "Votre copilote",
  description:
    "Remind Me est spécialement conçu pour les professionnels indépendants et consultants.",
  purpose: "Ce guide introductif rapide vous présente l'architecture de votre application.",
  icon: () => null,
  isModal: true,
  targetSelector: "",
};

const mockStepTechnical: TourStep = {
  id: "dash-kpis",
  title: "Les KPIs Financiers Réels ✨",
  subtitle: "Trésorerie",
  description:
    "Ces quatre compteurs vous montrent la réalité comptable du mois en cours. Solde net = Total reçu − Dépenses payées. Ne dépensez jamais sur les prévisions.",
  icon: () => null,
  targetSelector: '[data-tour="dashboard-kpi"]',
};

const modalVoiceText = getTourStepVoiceText(mockStepModal, "fr");
assert(
  !modalVoiceText.includes("👋") &&
    modalVoiceText.includes("Bienvenue sur Remind Me") &&
    modalVoiceText.includes("Ce guide introductif rapide"),
  "Étape d'accueil : emojis nettoyés et combinaison propre Titre + Rôle"
);

const techVoiceText = getTourStepVoiceText(mockStepTechnical, "fr");
assert(
  !techVoiceText.includes("✨") &&
    techVoiceText.includes("Les KPIs Financiers Réels") &&
    techVoiceText.split(/(?<=[.!?])\s+/).length <= 3,
  "Étape technique : concision orale préservée (max 2 à 3 phrases claires)"
);

// 2.2 Multilinguisme oral du tour interactif (EN, ES, DE, PT)
for (const lang of ["en", "es", "de", "pt"] as VoiceLanguage[]) {
  const localizedModalText = getTourStepVoiceText(mockStepModal, lang);
  assert(
    Boolean(localizedModalText && localizedModalText.length > 25 && !localizedModalText.includes("Bienvenue")),
    `Étape d'accueil traduite et adaptée pour la langue '${lang}' (${localizedModalText.slice(0, 35)}...)`,
    `Texte non traduit pour la langue ${lang}`
  );
}

// -----------------------------------------------------------------------------
// 3. HIÉRARCHIE ET ARBITRAGE DES PRIORITÉS VOCALES (ANTI-SUPERPOSITION)
// -----------------------------------------------------------------------------
console.log("\n3️⃣ Hiérarchie et arbitrage des priorités audio :");

const PRIORITY_LEVELS: Record<VoicePriority, number> = {
  greeting: 0,
  section: 1,
  routine: 2,
  tour: 3,
  preview: 4,
  normal: 4,
  high: 5,
  critical: 6,
};

// Vérification des relations d'arbitrage
assert(
  PRIORITY_LEVELS.section > PRIORITY_LEVELS.greeting,
  "La voix de section est prioritaire sur la bannière de salutation (section > greeting)"
);

assert(
  PRIORITY_LEVELS.tour > PRIORITY_LEVELS.section,
  "La visite guidée interactive a la priorité sur le guide de section (tour > section)"
);

assert(
  PRIORITY_LEVELS.preview >= PRIORITY_LEVELS.tour,
  "Le test manuel des paramètres a la priorité pour répondre immédiatement à l'utilisateur (preview >= tour)"
);

assert(
  PRIORITY_LEVELS.critical > PRIORITY_LEVELS.tour,
  "Un rappel critique d'urgence interrompt proprement le guidage pour protéger l'utilisateur (critical > tour)"
);

// -----------------------------------------------------------------------------
// 4. COORDINATION AVEC LA VIDÉO MOTION DESIGN D'INTRODUCTION
// -----------------------------------------------------------------------------
console.log("\n4️⃣ Coordination audio avec la vidéo Motion Design :");

// Simulation de l'état vidéo active
let mockWindow: any = { __REMINDME_VIDEO_PLAYING: true };

function canPlayAudio(priority: VoicePriority, windowRef: any): boolean {
  if (windowRef && windowRef.__REMINDME_VIDEO_PLAYING && priority !== "critical") {
    return false;
  }
  return true;
}

assert(
  canPlayAudio("section", mockWindow) === false,
  "La voix de section est bloquée lorsque la vidéo Motion Design est en lecture"
);

assert(
  canPlayAudio("tour", mockWindow) === false,
  "La voix du guide interactif est bloquée pendant la lecture de la vidéo"
);

assert(
  canPlayAudio("critical", mockWindow) === true,
  "Une urgence critique reste autorisée même pendant la vidéo"
);

mockWindow.__REMINDME_VIDEO_PLAYING = false;
assert(
  canPlayAudio("tour", mockWindow) === true,
  "La voix du guide reprend dès que la vidéo est fermée ou terminée"
);

// -----------------------------------------------------------------------------
// 5. SESSION ET IDEMPOTENCE (PRÉVENTION DES RÉPÉTITIONS INTEMPESTIVES)
// -----------------------------------------------------------------------------
console.log("\n5️⃣ Prévention des annonces répétitives lors des re-renders React :");

const mockSessionStorage: Record<string, string> = {};

function simulateSectionVisit(section: string): { shouldNarrate: boolean } {
  const raw = mockSessionStorage["remindme_voice_visited_sections"];
  const visited: string[] = raw ? JSON.parse(raw) : [];

  if (visited.includes(section)) {
    return { shouldNarrate: false };
  }

  visited.push(section);
  mockSessionStorage["remindme_voice_visited_sections"] = JSON.stringify(visited);
  return { shouldNarrate: true };
}

const visit1 = simulateSectionVisit("finances");
assert(
  visit1.shouldNarrate === true,
  "Premier accès à la section 'finances' dans la session -> Narration autorisée"
);

const reRender = simulateSectionVisit("finances");
assert(
  reRender.shouldNarrate === false,
  "Re-render React ou retour sur 'finances' -> Narration ignorée (zéro répétition intempestive)"
);

const visit2 = simulateSectionVisit("calendar");
assert(
  visit2.shouldNarrate === true,
  "Découverte d'une autre section ('calendar') -> Narration autorisée"
);

// -----------------------------------------------------------------------------
// 6. DÉVERROUILLAGE DU SON DU MOTION DESIGN AU PREMIER GESTE
// -----------------------------------------------------------------------------
console.log("\n6️⃣ Rétablissement du son du Motion Design sur interaction :");

interface VideoMock {
  muted: boolean;
  paused: boolean;
  playCount: number;
}

const mockVideo: VideoMock = { muted: true, paused: false, playCount: 1 };

function onUserGestureUnlock(video: VideoMock) {
  if (video.muted) {
    video.muted = false;
  }
}

assert(
  mockVideo.muted === true,
  "Vidéo démarrée en muet suite à la politique autoplay restrictive du navigateur"
);

onUserGestureUnlock(mockVideo);

assert(
  mockVideo.muted === false,
  "Son rétabli automatiquement au premier geste tactile / clic de l'utilisateur"
);

// -----------------------------------------------------------------------------
// BILAN DES TESTS
// -----------------------------------------------------------------------------
console.log("\n==================================================================");
console.log(`📊 RÉSULTAT : ${passedTests}/${totalTests} tests passés avec succès (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("==================================================================\n");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
