#!/usr/bin/env node
/**
 * Codemod i18n (2ᵉ passe) : phrases construites avec des valeurs.
 *
 *   node scripts/i18n-wrap-templates.mjs [--lib] fichiers…
 *
 *   `${n} séance${n > 1 ? "s" : ""} prévue${n > 1 ? "s" : ""}`
 *     → (n > 1 ? tr("{n} séances prévues", { n }) : tr("{n} séance prévue", { n }))
 *
 * Mode composants (défaut) : gabarits affichés dans le JSX ou les toasts, uniquement dans
 * un composant qui dispose déjà de `tr`.
 * Mode --lib (moteur de notifications, e-mails…) : tout texte français situé dans une
 * fonction qui déclare `const tr = …`.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const args = process.argv.slice(2);
const LIB = args.includes("--lib");
const files = args.filter((a) => !a.startsWith("--"));

// Propriétés techniques : jamais traduites
const TECH_PROPS = new Set([
  "idempotency_key", "link", "kind", "category", "entity_type", "email_template", "status", "priority",
  "title_key", "body_key", "type", "key", "id", "href", "className", "voice_text", "voiceText",
]);

const FR_WORDS = /\b(le|la|les|de|des|du|un|une|vos|votre|vous|dans|pour|jours?|aujourd|demain|séances?|tâches?|paiements?|factures?|dépenses?|activités?|rappel|prévue?s?|en retard|à régler|attendu|bonjour|bonsoir|semaine|mois|heures?|minutes?)\b/i;
const isFrench = (s) => /[À-ÿ]/.test(s) || FR_WORDS.test(s);

function placeholderName(expr, used, i) {
  let base = ts.isIdentifier(expr) ? expr.text : ts.isPropertyAccessExpression(expr) ? expr.name.text : `v${i}`;
  base = base.replace(/[^A-Za-z0-9_]/g, "") || `v${i}`;
  let name = base;
  let k = 2;
  while (used.has(name) && used.get(name) !== expr.getText()) name = `${base}${k++}`;
  used.set(name, expr.getText());
  return name;
}

const isPluralMarker = (e) =>
  ts.isConditionalExpression(e) &&
  ts.isStringLiteral(e.whenTrue) && ts.isStringLiteral(e.whenFalse) &&
  e.whenTrue.text.length <= 3 && e.whenFalse.text.length <= 3 &&
  /^[a-zé]*$/.test(e.whenTrue.text + e.whenFalse.text);

/** Construit le remplacement tr(...) d'un gabarit, ou null si non convertible. */
function convertTemplate(node, sf) {
  const used = new Map();
  const params = [];
  let condText = null;
  const partsTrue = [node.head.text];
  const partsFalse = [node.head.text];
  node.templateSpans.forEach((span, i) => {
    const e = span.expression;
    if (isPluralMarker(e)) {
      const c = e.condition.getText(sf);
      if (condText !== null && condText !== c) condText = "__MIXED__";
      else condText = c;
      partsTrue.push(e.whenTrue.text, span.literal.text);
      partsFalse.push(e.whenFalse.text, span.literal.text);
    } else {
      const name = placeholderName(e, used, i);
      if (!params.some((p) => p.name === name)) params.push({ name, text: e.getText(sf), isId: ts.isIdentifier(e) && e.text === name });
      partsTrue.push(`{${name}}`, span.literal.text);
      partsFalse.push(`{${name}}`, span.literal.text);
    }
  });
  if (condText === "__MIXED__") return null;
  const a = partsTrue.join("");
  const b = partsFalse.join("");
  if (!isFrench(a) || !/[A-Za-zÀ-ÿ]{2,}/.test(a.replace(/\{\w+\}/g, ""))) return null;
  const obj = params.length ? `, { ${params.map((p) => (p.isId ? p.name : `${p.name}: ${p.text}`)).join(", ")} }` : "";
  const sources = condText ? [a, b] : [a];
  const text = condText
    ? `(${condText} ? tr(${JSON.stringify(a)}${obj}) : tr(${JSON.stringify(b)}${obj}))`
    : `tr(${JSON.stringify(a)}${obj})`;
  return { text, sources };
}

const isPascal = (n) => /^[A-Z]/.test(n || "");
function hasTrInScope(node, sf) {
  let cur = node.parent;
  while (cur) {
    if ((ts.isFunctionDeclaration(cur) || ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) && cur.body && ts.isBlock(cur.body)) {
      const head = cur.body.getText(sf).split("\n").slice(0, 40).join("\n");
      if (/\bconst\s+tr\s*=|\btr\s*[,}][^\n]*=\s*useLanguage\(\)|\{[^}]*\btr\b[^}]*\}\s*=\s*useLanguage\(\)/.test(head)) return true;
    }
    cur = cur.parent;
  }
  return false;
}

function inDisplayContext(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isJsxExpression(cur)) return true;
    if (ts.isCallExpression(cur)) {
      const c = cur.expression;
      const name = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : "";
      return ["push", "showToast", "toast", "setError", "setMessage", "alert", "confirm"].includes(name);
    }
    if (ts.isConditionalExpression(cur) || ts.isParenthesizedExpression(cur) || ts.isBinaryExpression(cur)) {
      cur = cur.parent;
      continue;
    }
    return false;
  }
  return false;
}

function techContext(node) {
  let cur = node.parent;
  while (cur && (ts.isConditionalExpression(cur) || ts.isParenthesizedExpression(cur) || ts.isBinaryExpression(cur))) cur = cur.parent;
  if (cur && ts.isPropertyAssignment(cur) && TECH_PROPS.has(cur.name.getText())) return true;
  if (cur && ts.isCallExpression(cur) && /^console\./.test(cur.expression.getText())) return true;
  if (cur && (ts.isThrowStatement(cur) || ts.isNewExpression(cur))) return true;
  if (cur && ts.isCallExpression(cur) && ts.isIdentifier(cur.expression) && ["tr", "t", "msg"].includes(cur.expression.text)) return true;
  return false;
}

let total = 0;
for (const f of files) {
  const abs = path.resolve(f);
  const src = fs.readFileSync(abs, "utf8");
  const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true, abs.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const visit = (node) => {
    if (ts.isTemplateExpression(node)) {
      const ok = LIB ? !techContext(node) : inDisplayContext(node);
      if (ok && hasTrInScope(node, sf)) {
        const conv = convertTemplate(node, sf);
        if (conv) {
          edits.push({ start: node.getStart(sf), end: node.getEnd(), text: conv.text });
          total += conv.sources.length;
          return; // pas de traitement des gabarits imbriqués
        }
      }
    } else if (LIB && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
      const v = node.text;
      const parent = node.parent;
      const isKey = ts.isPropertyAssignment(parent) && parent.name === node;
      const isImport = ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isLiteralTypeNode(parent);
      if (!isKey && !isImport && !techContext(node) && isFrench(v) && /\s/.test(v.trim()) && hasTrInScope(node, sf)) {
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `tr(${JSON.stringify(v)})` });
        total += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!edits.length) continue;
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  fs.writeFileSync(abs, out);
  console.log(`${String(edits.length).padStart(4)}  ${path.relative(process.cwd(), abs)}`);
}
console.log(`\n${total} phrases converties.`);
