#!/usr/bin/env node
/**
 * Traduction automatique des textes tr("…") avec DeepL.
 *
 *   npm run i18n:translate            → traduit ce qui manque dans toutes les langues
 *   npm run i18n:translate -- --dry   → compte seulement les caractères à envoyer (aucun appel)
 *
 * Clé : DEEPL_API_KEY dans .env.local (une clé gratuite se termine par « :fx »).
 * Seuls les textes absents d'un catalogue sont envoyés : relancer le script ne coûte rien
 * de plus, et un nouveau texte ajouté dans le code est traduit au prochain lancement.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const DRY = process.argv.includes("--dry");
const CATALOG_DIR = path.join(ROOT, "lib/i18n/catalog");

// Code DeepL par langue de l'app (le hindi n'est pas proposé par DeepL : il reprend l'anglais)
const TARGETS = {
  fr: "FR", en: "EN-US", es: "ES", de: "DE", pt: "PT-BR", it: "IT",
  nl: "NL", ru: "RU", zh: "ZH-HANS", ja: "JA", ar: "AR",
};

// Jamais traduits : noms de marque / de forfait et noms de langues (toujours écrits dans leur langue)
const NEVER_TRANSLATE = new Set([
  "Pro", "Premium", "Remind Me", "Freelance", "Live", "Resend API", "KPIs",
  "Français", "English", "Español", "Deutsch", "Português", "Italiano", "Nederlands",
  "Русский", "中文", "日本語", "العربية", "हिन्दी",
]);

// Français = langue source : seuls les textes dans une autre langue y sont traduits.
// Ces textes courts sont déjà en français (DeepL les déformait : « Pro » → « Pour »…).
const FRENCH_AS_IS = new Set([
  "% pro", "Date", "En pause", "en Pro", "Focus :", "Libre PM", "non lu", "Ou", "Permanent", "Permanente",
  "Programmer", "Tarif (Mode Test) :", "Ex : Acme SARL", "Plan Gratuit", "Plan Pro", "Mission freelance / TJM",
  "Abonnement & Entitlements", "Voyez Remind Me", "Solde Net", "En Direct", "JSON Complet",
  "Basse", "Urgente", "Guide du planning",
]);

function readKey() {
  if (process.env.DEEPL_API_KEY) return process.env.DEEPL_API_KEY.trim();
  try {
    const line = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DEEPL_API_KEY="));
    return line ? line.slice("DEEPL_API_KEY=".length).replace(/^["']|["']$/g, "").trim() : "";
  } catch {
    return "";
  }
}

function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") out.push(...listFiles(p));
    else if (/\.(tsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Tous les textes passés littéralement à tr("…") dans le code. */
function collectSources() {
  const set = new Set();
  for (const file of [...listFiles(path.join(ROOT, "app")), ...listFiles(path.join(ROOT, "components")), ...listFiles(path.join(ROOT, "lib"))]) {
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes("tr(") && !src.includes("msg(")) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "tr" || node.expression.text === "msg")) {
        const arg = node.arguments[0];
        if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) set.add(arg.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return [...set].sort();
}

const readCatalog = (locale) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, `${locale}.json`), "utf8"));
  } catch {
    return {};
  }
};
const writeCatalog = (locale, data) => {
  const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(CATALOG_DIR, `${locale}.json`), JSON.stringify(sorted, null, 2) + "\n");
};

// Les variables {nom} sont protégées pour que DeepL ne les traduise pas
// (le texte est échappé en XML : &, < et > sont fréquents dans l'interface, ex. « Clients & Contacts »)
const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeXml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const protect = (s) => escapeXml(s).replace(/\{(\w+)\}/g, "<x>{$1}</x>");
const unprotect = (s) => unescapeXml(s.replace(/<x>\{(\w+)\}<\/x>/g, "{$1}").replace(/<\/?x>/g, ""));

async function deeplTranslate(key, texts, targetLang) {
  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const res = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: texts.map(protect),
      target_lang: targetLang,
      tag_handling: "xml",
      ignore_tags: ["x"],
      preserve_formatting: true,
      context: "Interface d'une application web de gestion d'activités, de tâches et de finances (Remind Me).",
    }),
  });
  if (res.status === 456) throw new Error("Quota DeepL du mois atteint : relancez le script le mois prochain ou passez à DeepL Pro.");
  if (!res.ok) throw new Error(`DeepL ${res.status} : ${await res.text()}`);
  const data = await res.json();
  return data.translations.map((t) => ({ text: unprotect(t.text), detected: t.detected_source_language }));
}

async function main() {
  const sources = collectSources().filter((s) => !NEVER_TRANSLATE.has(s));
  console.log(`${sources.length} textes trouvés dans le code.`);

  // Nettoyage : retire des catalogues les textes à ne pas traduire
  for (const locale of [...Object.keys(TARGETS), "hi"]) {
    const catalog = readCatalog(locale);
    let changed = false;
    for (const s of Object.keys(catalog)) {
      if (NEVER_TRANSLATE.has(s) || (locale === "fr" && FRENCH_AS_IS.has(s))) {
        delete catalog[s];
        changed = true;
      }
    }
    if (changed) writeCatalog(locale, catalog);
  }

  let totalChars = 0;
  const plan = {};
  for (const [locale] of Object.entries(TARGETS)) {
    const catalog = readCatalog(locale);
    // Le français est la langue source : seuls les textes sans accent (souvent anglais) y sont envoyés
    const missing = sources.filter(
      (s) => !catalog[s] && (locale !== "fr" || (/^[\x00-\x7F]+$/.test(s) && !FRENCH_AS_IS.has(s)))
    );
    plan[locale] = missing;
    const chars = missing.reduce((n, s) => n + s.length, 0);
    totalChars += chars;
    console.log(`  ${locale.padEnd(3)} ${String(missing.length).padStart(5)} à traduire  (${chars} caractères)`);
  }
  console.log(`Total : ${totalChars} caractères (quota visible sur deepl.com → Compte → Utilisation).`);
  if (DRY) return;

  const key = readKey();
  if (!key) {
    console.error("\nDEEPL_API_KEY manquante : ajoutez-la dans .env.local puis relancez.");
    process.exit(1);
  }

  for (const [locale, target] of Object.entries(TARGETS)) {
    const missing = plan[locale];
    if (!missing.length) continue;
    const catalog = readCatalog(locale);
    for (let i = 0; i < missing.length; i += 40) {
      const batch = missing.slice(i, i + 40);
      const out = await deeplTranslate(key, batch, target);
      batch.forEach((s, j) => {
        // Vers le français : un texte déjà détecté comme français est conservé tel quel
        catalog[s] = locale === "fr" && out[j].detected === "FR" ? s : out[j].text;
      });
      writeCatalog(locale, catalog); // sauvegarde au fil de l'eau : rien n'est perdu en cas d'arrêt
      process.stdout.write(`\r  ${locale} ${Math.min(i + 40, missing.length)}/${missing.length}`);
    }
    process.stdout.write("\n");
  }

  // Hindi : pas pris en charge par DeepL → reprend l'anglais en attendant
  writeCatalog("hi", { ...readCatalog("en"), ...readCatalog("hi") });
  console.log("Terminé.");
}

main().catch((err) => {
  console.error(`\nErreur : ${err.message}`);
  process.exit(1);
});
