#!/usr/bin/env node
/**
 * Codemod i18n : entoure automatiquement les textes d'interface écrits en dur avec tr("…").
 *
 *   node scripts/i18n-wrap.mjs [--dry] [fichiers…]
 *
 * Couvre : textes JSX, attributs visibles (placeholder, title, aria-label, alt, label…),
 * chaînes affichées dans des expressions JSX (ternaires, ||, ??, &&) et messages de toast.
 * Composants client : ajoute `tr` à `useLanguage()` dans le composant concerné.
 * Composants serveur (pages async) : ajoute `const tr = await getTr();`.
 * Ignore les gabarits `${…}` et les constantes hors composant (à traiter à la main).
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const explicitFiles = args.filter((a) => !a.startsWith("--"));

const VISIBLE_ATTRS = new Set([
  "placeholder", "title", "aria-label", "alt", "label", "description", "emptyText", "helperText", "hint", "subtitle",
  "badge", "sub", "tagline", "caption", "helper",
]);
const TOAST_CALLEES = new Set(["push", "showToast", "toast", "setError", "setErrorMsg", "setMessage", "alert", "confirm"]);
const SKIP_FILES = new Set(["app/layout.tsx", "app/(print)/layout.tsx", "app/(app)/error.tsx", "app/error.tsx"]);

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(p));
    else if (entry.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function decodeEntities(s) {
  return s
    .replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&copy;/g, "©").replace(/&reg;/g, "®").replace(/&hellip;/g, "…").replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–").replace(/&middot;/g, "·").replace(/&rarr;/g, "→").replace(/&larr;/g, "←")
    .replace(/&euro;/g, "€").replace(/&#(d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Texte d'interface : au moins un mot de 2 lettres, pas un identifiant / une URL / une classe CSS. */
function isUiText(s) {
  const t = s.trim();
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(t)) return false;
  if (/^Remind ?Me$/i.test(t)) return false; // nom de marque : jamais traduit
  if (/&[a-z]+;/.test(t)) return false; // entité HTML non gérée : laissée telle quelle
  if (/^(https?:|\/(?!\s)|#|mailto:|tel:)/.test(t)) return false; // « / mois » reste un texte
  if (/^[a-z0-9_\-./:[\]()%]+$/.test(t)) return false; // identifiant, classe, chemin
  if (/^[A-Z0-9_]+$/.test(t) && t.length <= 4) return false; // FR, XOF, EUR…
  return true;
}

const isPascal = (name) => /^[A-Z]/.test(name || "");

function enclosingComponent(node) {
  let cur = node.parent;
  let candidate = null;
  while (cur) {
    if (ts.isFunctionDeclaration(cur) && isPascal(cur.name?.text)) candidate = cur;
    else if ((ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) && ts.isVariableDeclaration(cur.parent) && isPascal(cur.parent.name.getText())) candidate = cur;
    else if ((ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) && ts.isCallExpression(cur.parent)) {
      // forwardRef(function X() {}) / memo(() => …)
      const decl = cur.parent.parent;
      if (decl && ts.isVariableDeclaration(decl) && isPascal(decl.name.getText())) candidate = cur;
    }
    cur = cur.parent;
  }
  return candidate && candidate.body && ts.isBlock(candidate.body) ? candidate : null;
}

function inJsxExpression(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isJsxExpression(cur)) return true;
    if (
      ts.isConditionalExpression(cur) || ts.isParenthesizedExpression(cur) ||
      (ts.isBinaryExpression(cur) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(cur.operatorToken.kind))
    ) {
      cur = cur.parent;
      continue;
    }
    return false;
  }
  return false;
}

function isToastArg(node) {
  const call = node.parent;
  if (!call || !ts.isCallExpression(call) || call.arguments[0] !== node) return false;
  const callee = call.expression;
  const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
  return TOAST_CALLEES.has(name);
}

function processFile(abs) {
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  if (SKIP_FILES.has(rel)) return null;
  const src = fs.readFileSync(abs, "utf8");
  const isClient = /^\s*["']use client["']/.test(src);
  const isAppFile = rel.startsWith("app/");
  if (!isClient && !isAppFile) return null; // composants partagés sans "use client" : à la main

  const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = []; // { start, end, text }
  const components = new Set();
  const sources = [];

  const wrapExpr = (s) => `tr(${JSON.stringify(s)})`;

  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getText(sf);
      const decoded = decodeEntities(raw);
      if (isUiText(decoded)) {
        const comp = enclosingComponent(node);
        if (comp) {
          const core = decoded.replace(/\s+/g, " ").trim();
          const lead = /^[ \t]+\S/.test(decoded) && !/\n/.test(decoded.slice(0, decoded.search(/\S/))) ? '{" "}' : "";
          const tailWs = decoded.slice(decoded.trimEnd().length);
          const trail = tailWs.length > 0 && !/\n/.test(tailWs) ? '{" "}' : "";
          edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `${lead}{${wrapExpr(core)}}${trail}` });
          components.add(comp);
          sources.push(core);
        }
      }
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText(sf);
      const value = node.initializer.text;
      if (VISIBLE_ATTRS.has(name) && isUiText(value)) {
        const comp = enclosingComponent(node);
        if (comp) {
          edits.push({ start: node.initializer.getStart(sf), end: node.initializer.getEnd(), text: `{${wrapExpr(value)}}` });
          components.add(comp);
          sources.push(value);
        }
      }
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !ts.isJsxAttribute(node.parent) && !ts.isImportDeclaration(node.parent) && !ts.isExportDeclaration(node.parent)) {
      const value = node.text;
      const alreadyWrapped = ts.isCallExpression(node.parent) && ts.isIdentifier(node.parent.expression) && ["tr", "t"].includes(node.parent.expression.text);
      if (!alreadyWrapped && isUiText(value) && /\s/.test(value.trim()) || (!alreadyWrapped && isUiText(value) && /[À-ÿ]/.test(value))) {
        if (!alreadyWrapped && (inJsxExpression(node) || isToastArg(node))) {
          const comp = enclosingComponent(node);
          if (comp) {
            edits.push({ start: node.getStart(sf), end: node.getEnd(), text: wrapExpr(value) });
            components.add(comp);
            sources.push(value);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (edits.length === 0) return null;

  // Déclaration de `tr` en tête de chaque composant concerné
  for (const comp of components) {
    const body = comp.body;
    const bodyText = body.getText(sf);
    if (/\bconst\s+tr\s*=|\btr\s*[,}]/.test(bodyText.split("\n").slice(0, 25).join("\n"))) continue;
    const firstStmt = body.statements[0];
    const indentMatch = firstStmt ? src.slice(src.lastIndexOf("\n", firstStmt.getStart(sf)) + 1, firstStmt.getStart(sf)) : "  ";
    const indent = /^\s*$/.test(indentMatch) ? indentMatch : "  ";

    if (isClient) {
      // Réutilise un `const { … } = useLanguage();` existant si présent
      const useLang = body.statements.find(
        (st) => ts.isVariableStatement(st) && st.getText(sf).includes("useLanguage()") && ts.isObjectBindingPattern(st.declarationList.declarations[0]?.name)
      );
      if (useLang) {
        const pattern = useLang.declarationList.declarations[0].name;
        const hasTr = pattern.elements.some((el) => el.name.getText(sf) === "tr" || el.propertyName?.getText(sf) === "tr");
        if (!hasTr) edits.push({ start: pattern.getEnd() - 1, end: pattern.getEnd() - 1, text: `${pattern.elements.length ? ", " : ""}tr ` });
      } else {
        edits.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, text: `\n${indent}const { tr } = useLanguage();` });
      }
    } else {
      const isAsync = comp.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
      if (!isAsync) {
        // « async » se place juste avant le mot-clé function (après export / default), ou avant la flèche
        const at = ts.isFunctionDeclaration(comp) || ts.isFunctionExpression(comp)
          ? src.indexOf("function", comp.getStart(sf))
          : comp.getStart(sf);
        edits.push({ start: at, end: at, text: "async " });
      }
      edits.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, text: `\n${indent}const tr = await getTr();` });
    }
  }

  // Import nécessaire
  let out = src;
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  if (isClient && !/useLanguage\s*}?\s*from\s*["']@\/components\/i18n\/language-provider["']|import\s*{[^}]*useLanguage[^}]*}\s*from/.test(out)) {
    out = out.replace(/(["']use client["'];?\s*\n)/, `$1\nimport { useLanguage } from "@/components/i18n/language-provider";\n`);
  }
  if (!isClient && !/getTr\b[^\n]*from\s*["']@\/lib\/i18n\/server["']/.test(out)) {
    out = `import { getTr } from "@/lib/i18n/server";\n` + out;
  }

  if (!DRY) fs.writeFileSync(abs, out);
  return { rel, count: sources.length };
}

const files = explicitFiles.length
  ? explicitFiles.map((f) => path.resolve(ROOT, f))
  : [...listFiles(path.join(ROOT, "components")), ...listFiles(path.join(ROOT, "app"))];

let total = 0;
for (const f of files) {
  try {
    const r = processFile(f);
    if (r) {
      total += r.count;
      console.log(`${String(r.count).padStart(4)}  ${r.rel}`);
    }
  } catch (err) {
    console.error(`ERREUR ${f}: ${err.message}`);
  }
}
console.log(`\n${total} textes ${DRY ? "détectés" : "marqués"}.`);
