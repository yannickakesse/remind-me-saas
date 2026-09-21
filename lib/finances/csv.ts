import { DateTime } from "luxon";
import { financeStatusLabel } from "@/lib/validation/finances";
import type { IncomeRow, ExpenseRow } from "./aggregate";

// Point-virgule plutôt que virgule : Excel en configuration régionale
// française (celle de l'utilisateur) ouvre un CSV avec ";" par défaut,
// la virgule étant réservée au séparateur décimal — un CSV en virgules
// s'ouvrirait dans Excel FR avec tout dans une seule colonne.
const DELIMITER = ";";

function csvField(value: string | number | null | undefined): string {
  let str = value === null || value === undefined ? "" : String(value);

  // Neutralisation contre l'injection de formules CSV (CWE-1236)
  // Si une cellule commence par =, +, -, @, \t, ou \r, Excel/Sheets l'interprète comme une formule.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (str.includes(DELIMITER) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(iso: string | null, timezone: string): string {
  if (!iso) return "";
  return DateTime.fromISO(iso, { zone: timezone }).toFormat("dd/MM/yyyy");
}

function formatAmount(amount: number): string {
  // Préserve fidèlement les montants entiers (ex: 60000 XOF -> 60000)
  // et formate avec 2 décimales uniquement si des centimes existent (ex: 12.50 EUR).
  if (Number.isInteger(amount)) {
    return String(amount);
  }
  return amount.toFixed(2);
}

const HEADER = [
  "Type",
  "Libellé",
  "Activité",
  "Catégorie",
  "Montant",
  "Devise",
  "Échéance",
  "Statut",
  "Reçu / payé le",
  "Notes",
];

export interface FinancesCsvOptions {
  userName?: string | null;
  userEmail?: string | null;
  rangeStart?: string;
  rangeEnd?: string;
}

type Line = {
  dueDateISO: string;
  cells: string[];
};

/**
 * Construit le CSV export "Finances" (revenus + dépenses fusionnés,
 * triés par échéance) avec la certification et les indicatifs de marque Remind Me.
 */
export function buildFinancesCsv(
  income: IncomeRow[],
  expenses: ExpenseRow[],
  timezone: string,
  options?: FinancesCsvOptions
): string {
  const nowStr = DateTime.now().setZone(timezone).toFormat("dd/MM/yyyy 'à' HH:mm");
  const periodStr = options?.rangeStart && options?.rangeEnd
    ? `Du ${DateTime.fromISO(options.rangeStart).toFormat("dd/MM/yyyy")} au ${DateTime.fromISO(options.rangeEnd).toFormat("dd/MM/yyyy")}`
    : "Période globale";

  const userStr = [options?.userName, options?.userEmail ? `(${options.userEmail})` : ""]
    .filter(Boolean)
    .join(" ") || "Compte Remind Me";

  // Calculs de synthèse pour le pied de page
  const totalReceived = income.filter((i) => i.received).reduce((s, i) => s + Number(i.amount), 0);
  const totalExpected = income.filter((i) => !i.received).reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = expenses.filter((e) => e.paid).reduce((s, e) => s + Number(e.amount), 0);
  const totalPlanned = expenses.filter((e) => !e.paid).reduce((s, e) => s + Number(e.amount), 0);
  const netReal = totalReceived - totalPaid;

  const metadataHeader = [
    `# ==============================================================================`,
    `# REMIND ME — RAPPORT FINANCIER & SUIVI MULTI-ACTIVITÉS`,
    `# Produit et certifié par la plateforme Remind Me (https://remind-me-saas.vercel.app)`,
    `# Solution de pilotage multi-activités, gestion de planning et rentabilité`,
    `#`,
    `# Titulaire du compte : ${userStr}`,
    `# Date de génération : ${nowStr} (${timezone})`,
    `# Période couverte    : ${periodStr}`,
    `# ==============================================================================`,
    ``,
  ].join("\r\n");

  const lines: Line[] = [];

  for (const i of income) {
    lines.push({
      dueDateISO: i.due_date,
      cells: [
        "Revenu",
        i.label,
        i.activity?.name ?? "",
        "",
        formatAmount(i.amount),
        i.currency,
        formatDate(i.due_date, timezone),
        financeStatusLabel(i.status, "income"),
        formatDate(i.received_at, timezone),
        i.notes ?? "",
      ],
    });
  }

  for (const e of expenses) {
    lines.push({
      dueDateISO: e.due_date,
      cells: [
        "Dépense",
        e.label,
        e.activity?.name ?? "",
        e.category ?? "",
        formatAmount(e.amount),
        e.currency,
        formatDate(e.due_date, timezone),
        financeStatusLabel(e.status, "expense"),
        formatDate(e.paid_at, timezone),
        e.notes ?? "",
      ],
    });
  }

  lines.sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO));

  const rows = [HEADER, ...lines.map((l) => l.cells)];
  const tableBody = rows.map((cells) => cells.map(csvField).join(DELIMITER)).join("\r\n");

  const metadataFooter = [
    ``,
    `# ------------------------------------------------------------------------------`,
    `# SYNTHÈSE REMIND ME — REVENUS & DÉPENSES`,
    `# Total Revenus Reçus (Encaissés) : ${formatAmount(totalReceived)}`,
    `# Total Revenus Attendus (En attente) : ${formatAmount(totalExpected)}`,
    `# Total Dépenses Payées : ${formatAmount(totalPaid)}`,
    `# Total Dépenses Prévues : ${formatAmount(totalPlanned)}`,
    `# Solde Réel Net (Reçus - Payés) : ${formatAmount(netReal)}`,
    `#`,
    `# Export certifié généré avec succès par Remind Me.`,
    `# ------------------------------------------------------------------------------`,
  ].join("\r\n");

  // BOM UTF-8 en tête (﻿) pour compatibilité Excel
  const BOM = "﻿";
  return `${BOM}${metadataHeader}${tableBody}\r\n${metadataFooter}\r\n`;
}
