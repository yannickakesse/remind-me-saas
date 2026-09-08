import { z } from "zod";
import { DateTime } from "luxon";

export type FinanceStatus = "received" | "paid" | "overdue" | "expected" | "future";

export function deriveFinanceStatus(
  fulfilled: boolean | string | null | undefined,
  dueDate: string | null | undefined,
  userTimezone: string = "UTC"
): FinanceStatus {
  if (fulfilled === true || (typeof fulfilled === "string" && fulfilled.trim().length > 0)) {
    return "received"; // ou "paid"
  }
  if (!dueDate) {
    return "expected";
  }

  const now = DateTime.now().setZone(userTimezone);
  const today = now.toISODate()!;
  const currentMonth = now.toFormat("yyyy-MM");
  const dueMonth = dueDate.slice(0, 7);

  if (dueDate < today) {
    return "overdue";
  }
  if (dueMonth <= currentMonth) {
    return "expected";
  }
  return "future";
}

export const FINANCE_STATUS_STYLES: Record<FinanceStatus, { border: string; text: string; bg: string }> = {
  received: { border: "border-positive/30", text: "text-positive", bg: "bg-positive-soft" },
  paid: { border: "border-positive/30", text: "text-positive", bg: "bg-positive-soft" },
  overdue: { border: "border-danger/30", text: "text-danger", bg: "bg-danger-soft" },
  expected: { border: "border-signal/30", text: "text-signal", bg: "bg-signal-soft" },
  future: { border: "border-ink-300", text: "text-ink-600", bg: "bg-ink-100" },
};

export function financeStatusLabel(status: FinanceStatus, kind: "income" | "expense"): string {
  switch (status) {
    case "received":
      return "Reçu";
    case "paid":
      return "Payée";
    case "overdue":
      return "En retard";
    case "expected":
      return "Ce mois-ci (prévu)";
    case "future":
      return "Plus tard";
  }
}

export const EXPENSE_CATEGORIES = [
  { value: "software", label: "Logiciels & Abonnements" },
  { value: "equipment", label: "Matériel & Équipement" },
  { value: "travel", label: "Déplacements & Transport" },
  { value: "food", label: "Repas & Restauration" },
  { value: "housing", label: "Logement & Bureaux" },
  { value: "utilities", label: "Charges, Eau, Électricité, Internet" },
  { value: "education", label: "Formation & Livres" },
  { value: "marketing", label: "Marketing & Publicité" },
  { value: "services", label: "Prestations & Sous-traitance" },
  { value: "taxes", label: "Impôts, Taxes & Cotisations" },
  { value: "health", label: "Santé & Assurances" },
  { value: "other", label: "Autre dépense" },
] as const;

export function expenseCategoryLabel(cat?: string | null): string {
  if (!cat) return "Autre";
  return EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "card", label: "Carte bancaire" },
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money (Wave, Orange, etc.)" },
  { value: "check", label: "Chèque" },
  { value: "other", label: "Autre moyen" },
] as const;

export const SAVINGS_CATEGORIES = [
  { value: "emergency_fund", label: "Fonds d'urgence / Sécurité" },
  { value: "business", label: "Projet professionnel / Business" },
  { value: "real_estate", label: "Immobilier / Logement" },
  { value: "car", label: "Véhicule / Transport" },
  { value: "vacation", label: "Vacances & Voyages" },
  { value: "education", label: "Formation & Éducation" },
  { value: "equipment", label: "Matériel informatique & Pro" },
  { value: "other", label: "Autre projet" },
] as const;

export const incomeFormSchema = z.object({
  activityId: z.string().uuid().optional().or(z.literal("")),
  label: z.string().min(1, "Le libellé est requis"),
  amount: z.coerce.number().positive("Le montant doit être strictement positif"),
  currency: z.string().min(1, "La devise est requise"),
  incomeType: z.enum(["salary", "contract", "freelance", "sales", "coaching", "dividend", "other"]).default("contract"),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const expenseFormSchema = z.object({
  activityId: z.string().uuid().optional().or(z.literal("")),
  label: z.string().min(1, "Le libellé est requis"),
  category: z.string().min(1, "La catégorie est requise"),
  amount: z.coerce.number().positive("Le montant doit être strictement positif"),
  currency: z.string().min(1, "La devise est requise"),
  expenseType: z.enum(["personal", "business", "mixed"]).default("personal"),
  businessPercentage: z.coerce.number().min(0).max(100).default(100),
  merchant: z.string().optional(),
  paymentMethod: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const budgetFormSchema = z.object({
  category: z.string().min(1, "La catégorie est requise"),
  monthlyLimit: z.coerce.number().positive("La limite mensuelle doit être strictement positive"),
  currency: z.string().min(1, "La devise est requise"),
  notes: z.string().optional(),
});

export const savingsGoalFormSchema = z.object({
  name: z.string().min(1, "Le nom de l'objectif est requis"),
  category: z.enum([
    "emergency_fund",
    "vacation",
    "car",
    "business",
    "real_estate",
    "education",
    "equipment",
    "other",
  ]).default("other"),
  targetAmount: z.coerce.number().positive("Le montant cible doit être strictement positif"),
  currentAmount: z.coerce.number().min(0, "Le montant initial ne peut être négatif").default(0),
  currency: z.string().min(1, "La devise est requise"),
  deadline: z.string().optional().or(z.literal("")),
  monthlyContribution: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});
