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
  // Point décimal (pas de virgule) : un nombre au format CSV doit rester
  // sans ambiguïté avec le séparateur de colonnes, y compris s'il est
  // réouvert par un autre outil que Excel (import comptable, script...).
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

type Line = { dueDateISO: string; cells: string[] };

/**
 * Construit le CSV export "Finances" (revenus + dépenses fusionnés,
 * triés par échéance) à partir des mêmes lignes que la page /finances —
 * voir lib/finances/aggregate.ts::getFinancesForRange, appelée par les
 * deux consommateurs pour ne jamais diverger.
 */
export function buildFinancesCsv(income: IncomeRow[], expenses: ExpenseRow[], timezone: string): string {
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
  const body = rows.map((cells) => cells.map(csvField).join(DELIMITER)).join("\r\n");

  // BOM UTF-8 en tête (﻿) : sans lui, Excel affiche les accents
  // (é, è, à...) comme des caractères corrompus au lieu de détecter
  // l'encodage.
  const BOM = "﻿";
  return `${BOM}${body}\r\n`;
}
