import { z } from "zod";
import { DateTime } from "luxon";

// ----------------------------------------------------------------------------
// Statut dérivé — jamais stocké en base, jamais saisi à la main.
// "en retard" dépend du jour courant, qui avance sans aucune action de
// l'utilisateur : un statut stocké deviendrait faux tout seul. On le
// recalcule donc à chaque lecture, exactement comme /tasks calcule déjà
// "en retard" en comparant due_date à aujourd'hui plutôt que de le stocker.
//
// Répartition prévu / futur : une échéance non reçue/payée tombant dans le
// mois civil en cours est "prévu" (imminente) ; au-delà, elle est "futur"
// (horizon plus lointain). Ce découpage sert le tableau de bord
// prévisionnel du mois vs les revenus/dépenses à venir plus tard.
// ----------------------------------------------------------------------------
export type FinanceStatus = "received" | "late" | "planned" | "future";

export function deriveFinanceStatus(
  dueDateISO: string,
  isSettled: boolean,
  todayISO: string
): FinanceStatus {
  if (isSettled) return "received";
  if (dueDateISO < todayISO) return "late";

  const today = DateTime.fromISO(todayISO);
  const due = DateTime.fromISO(dueDateISO);
  const sameMonth = due.hasSame(today, "month") && due.hasSame(today, "year");

  return sameMonth ? "planned" : "future";
}

export function financeStatusLabel(status: FinanceStatus, kind: "income" | "expense"): string {
  switch (status) {
    case "received":
      return kind === "income" ? "Reçu" : "Payé";
    case "late":
      return "En retard";
    case "planned":
      return "Prévu";
    case "future":
      return "Futur";
  }
}

export const FINANCE_STATUS_STYLES: Record<FinanceStatus, string> = {
  received: "border-positive text-positive",
  late: "border-danger text-danger",
  planned: "border-signal text-signal",
  future: "border-ink-300 text-ink-500",
};

// ----------------------------------------------------------------------------
// Formulaires
// ----------------------------------------------------------------------------
export const incomeFormSchema = z.object({
  activityId: z.string().uuid().optional().or(z.literal("")),
  label: z.string().min(1, "Le libellé est requis"),
  amount: z.coerce.number().min(0, "Le montant doit être positif ou nul"),
  currency: z.string().min(1, "La devise est requise"),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  notes: z.string().optional(),
});
export type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export const expenseFormSchema = z.object({
  activityId: z.string().uuid().optional().or(z.literal("")),
  label: z.string().min(1, "Le libellé est requis"),
  category: z.string().optional(),
  amount: z.coerce.number().min(0, "Le montant doit être positif ou nul"),
  currency: z.string().min(1, "La devise est requise"),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  notes: z.string().optional(),
});
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const EXPENSE_CATEGORIES = [
  "Matériel",
  "Logiciel / abonnement",
  "Transport",
  "Local / loyer",
  "Marketing",
  "Impôts / cotisations",
  "Autre",
];
