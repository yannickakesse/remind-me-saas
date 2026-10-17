import { DateTime } from "luxon";
import * as fs from "fs";
import * as path from "path";
import { generateCalendarPdf, type CalendarPdfEvent } from "@/lib/calendar/pdf-generator";
import { fr } from "@/lib/i18n/locales/fr";
import { en } from "@/lib/i18n/locales/en";
import { es } from "@/lib/i18n/locales/es";
import { de } from "@/lib/i18n/locales/de";
import { pt } from "@/lib/i18n/locales/pt";

async function runPhase7Tests() {
  console.log("=================================================");
  console.log("PHASE 7 TEST SUITE — CALENDRIER PDF A4 REMIND ME");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Translation Keys Verification
  console.log("1. VÉRIFICATION DES CLÉS DE TRADUCTION");
  const requiredKeys = [
    "calendar.export_pdf",
    "calendar.download_pdf",
    "calendar.print_pdf",
    "calendar.exporting",
    "calendar.export_error",
    "calendar.orientation_landscape",
    "calendar.orientation_portrait",
    "calendar.print_title",
    "calendar.legend_title",
  ] as const;

  for (const key of requiredKeys) {
    assert(Boolean(fr[key]), `FR translation present: ${key}`, fr[key]);
    assert(Boolean(en[key]), `EN translation present: ${key}`, en[key]);
    assert(Boolean(es[key]), `ES translation present: ${key}`, es[key]);
    assert(Boolean(de[key]), `DE translation present: ${key}`, de[key]);
    assert(Boolean(pt[key]), `PT translation present: ${key}`, pt[key]);
  }

  // 2. Date and Timezone Handling (No UTC Drift)
  console.log("\n2. VÉRIFICATION DU CALCUL DES DATES ET FUSEAUX HORAIRES");
  const testTz = "Africa/Abidjan";
  const anchorDate = "2026-10-17";
  const dt = DateTime.fromISO(anchorDate, { zone: testTz });
  assert(dt.isValid, "Anchor date 2026-10-17 is valid in Africa/Abidjan");
  assert(dt.month === 10, "Month is strictly October");
  assert(dt.year === 2026, "Year is strictly 2026");

  const monthStart = dt.startOf("month");
  const gridStart = monthStart.startOf("week");
  assert(gridStart.weekday === 1, "Grid starts strictly on Monday (weekday = 1)");
  assert(gridStart <= monthStart, "Grid start is before or on 1st of month");

  // 3. PDF Generator Validation — Landscape A4
  console.log("\n3. GÉNÉRATION PDF A4 PAYSAGE (297 mm x 210 mm)");
  const sampleEvents: CalendarPdfEvent[] = [
    {
      id: "ev-1",
      title: "Séance Stratégie & Coaching",
      starts_at: "2026-10-05T09:00:00.000Z",
      ends_at: "2026-10-05T10:30:00.000Z",
      status: "planned",
      activityName: "Conseil Stratégique",
      activityColor: "#3B82F6",
      is_scheduled_expense: false,
    },
    {
      id: "ev-2",
      title: "Revue Budgétaire Q4",
      starts_at: "2026-10-12T14:00:00.000Z",
      ends_at: "2026-10-12T16:00:00.000Z",
      status: "confirmed",
      activityName: "Gestion Financière",
      activityColor: "#10B981",
      is_scheduled_expense: false,
    },
    {
      id: "ev-3",
      title: "Hébergement Cloud AWS (120 EUR)",
      starts_at: "2026-10-15T09:00:00.000Z",
      ends_at: "2026-10-15T10:00:00.000Z",
      status: "planned",
      activityName: "Dépense programmée",
      activityColor: "#D97706",
      is_scheduled_expense: true,
      amount: 120,
      currency: "EUR",
    },
    {
      id: "ev-4",
      title: "Atelier Design Sprint",
      starts_at: "2026-10-22T08:30:00.000Z",
      ends_at: "2026-10-22T12:00:00.000Z",
      status: "planned",
      activityName: "Développement Produit",
      activityColor: "#8B5CF6",
      is_scheduled_expense: false,
    },
  ];

  const sampleActivities = [
    { id: "act-1", name: "Conseil Stratégique", color: "#3B82F6" },
    { id: "act-2", name: "Gestion Financière", color: "#10B981" },
    { id: "act-3", name: "Développement Produit", color: "#8B5CF6" },
  ];

  const pdfLandscape = generateCalendarPdf({
    anchorDate: "2026-10-17",
    timezone: "Europe/Paris",
    locale: "fr",
    orientation: "landscape",
    user: {
      fullName: "Yannick Akessé",
      email: "yannick@remindme.io",
      planName: "Remind Me Premium",
    },
    events: sampleEvents,
    activities: sampleActivities,
    documentRef: "RM-CAL-202610-TEST",
  });

  assert(Buffer.isBuffer(pdfLandscape), "Landscape generator returns a Node Buffer");
  assert(pdfLandscape.length > 2000, `Landscape PDF size is realistic (${pdfLandscape.length} bytes)`);

  const pdfStr = pdfLandscape.toString("latin1");
  assert(pdfStr.startsWith("%PDF-1.4"), "PDF has authentic %PDF-1.4 magic header");
  assert(pdfStr.includes("/MediaBox [0 0 841.89 595.28]"), "Landscape MediaBox is exactly A4 (841.89 pt x 595.28 pt / 297 mm x 210 mm)");
  assert(pdfStr.includes("/BaseFont /Helvetica"), "Helvetica font dictionary is embedded");
  assert(pdfStr.includes("/BaseFont /Helvetica-Bold"), "Helvetica-Bold font dictionary is embedded");
  assert(pdfStr.includes("xref"), "Cross-reference table (xref) is generated");
  assert(pdfStr.includes("trailer"), "PDF trailer object is present");
  assert(pdfStr.includes("%%EOF"), "PDF terminates with standard %%EOF");
  assert(pdfStr.includes("REMIND ME"), "PDF content stream contains REMIND ME brand title");
  assert(pdfStr.includes("OCTOBRE 2026"), "PDF content stream contains OCTOBRE 2026");

  // Save landscape sample file for manual/visual inspection
  const outLandscapePath = path.join(__dirname, "test-calendar-landscape.pdf");
  fs.writeFileSync(outLandscapePath, pdfLandscape);
  console.log(`Saved landscape PDF to: ${outLandscapePath}`);

  // 4. PDF Generator Validation — Portrait A4
  console.log("\n4. GÉNÉRATION PDF A4 PORTRAIT (210 mm x 297 mm)");
  const pdfPortrait = generateCalendarPdf({
    anchorDate: "2026-10-17",
    timezone: "Europe/Paris",
    locale: "fr",
    orientation: "portrait",
    user: {
      fullName: "Yannick Akessé",
      email: "yannick@remindme.io",
      planName: "Remind Me Premium",
    },
    events: sampleEvents,
    activities: sampleActivities,
    documentRef: "RM-CAL-202610-PORT",
  });

  const pdfPortraitStr = pdfPortrait.toString("latin1");
  assert(pdfPortraitStr.includes("/MediaBox [0 0 595.28 841.89]"), "Portrait MediaBox is exactly A4 (595.28 pt x 841.89 pt / 210 mm x 297 mm)");

  // 5. Dense Calendar & Multi-Page Handling (Page 2 Appendix)
  console.log("\n5. GESTION DES CALENDRIERS CHARGÉS & MULTI-PAGES");
  const denseEvents: CalendarPdfEvent[] = [...sampleEvents];
  // Add 6 events on the same day (2026-10-14) to trigger day overflow
  for (let i = 1; i <= 6; i++) {
    denseEvents.push({
      id: `dense-${i}`,
      title: `Consultation client session n°${i}`,
      starts_at: `2026-10-14T${(8 + i).toString().padStart(2, "0")}:00:00.000Z`,
      ends_at: `2026-10-14T${(9 + i).toString().padStart(2, "0")}:00:00.000Z`,
      status: "planned",
      activityName: "Conseil Stratégique",
      activityColor: "#3B82F6",
      is_scheduled_expense: false,
    });
  }

  const pdfMultiPage = generateCalendarPdf({
    anchorDate: "2026-10-17",
    timezone: "Europe/Paris",
    locale: "fr",
    orientation: "landscape",
    user: {
      fullName: "Yannick Akessé",
      email: "yannick@remindme.io",
      planName: "Remind Me Premium",
    },
    events: denseEvents,
    activities: sampleActivities,
    documentRef: "RM-CAL-202610-DENSE",
  });

  const pdfDenseStr = pdfMultiPage.toString("latin1");
  assert(pdfDenseStr.includes("/Count 2"), "Multi-page PDF has exactly 2 pages (/Count 2)");
  assert(pdfDenseStr.includes("ANNEXE D\\311TAILL\\311E"), "Page 2 includes 'ANNEXE DÉTAILLÉE' header");
  assert(pdfDenseStr.includes("Page 2/2"), "Page 2 includes page numbering 'Page 2/2'");

  const outDensePath = path.join(__dirname, "test-calendar-dense.pdf");
  fs.writeFileSync(outDensePath, pdfMultiPage);
  console.log(`Saved dense multi-page PDF to: ${outDensePath}`);

  console.log("\n=================================================");
  console.log(`RÉSULTAT FINAL: ${passed} PASSÉS, ${failed} ÉCHECS`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
