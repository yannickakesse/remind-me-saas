import { z } from "zod";
import { DateTime } from "luxon";

export const scheduledExpenseSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").max(100, "Maximum 100 caractères"),
  category: z.string().trim().min(1, "La catégorie est obligatoire"),
  amount: z.coerce.number().positive("Le montant doit être supérieur à 0"),
  currency: z.string().min(3).max(3),
  frequency: z.enum(["once", "daily", "weekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().optional().nullable(),
  nextDueDate: z.string().min(1, "Date d'échéance requise"),
  status: z.enum(["planned", "due", "paid", "cancelled"]).default("planned"),
  activityId: z.string().uuid().optional().nullable(),
  merchant: z.string().trim().optional().nullable(),
  paymentMethod: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type ScheduledExpenseFormData = z.infer<typeof scheduledExpenseSchema>;

export function calculateNextOccurrence(currentDueDate: string, frequency: string): string {
  const dt = DateTime.fromISO(currentDueDate);
  if (!dt.isValid) return currentDueDate;

  switch (frequency) {
    case "daily":
      return dt.plus({ days: 1 }).toISODate()!;
    case "weekly":
      return dt.plus({ weeks: 1 }).toISODate()!;
    case "monthly":
      return dt.plus({ months: 1 }).toISODate()!;
    case "quarterly":
      return dt.plus({ months: 3 }).toISODate()!;
    case "yearly":
      return dt.plus({ years: 1 }).toISODate()!;
    default:
      return currentDueDate;
  }
}

export function scheduledStatusLabel(status: string): { label: string; variant: "default" | "warning" | "success" | "danger" } {
  switch (status) {
    case "planned":
      return { label: "Planifiée", variant: "default" };
    case "due":
      return { label: "Échue (À payer)", variant: "warning" };
    case "paid":
      return { label: "Payée", variant: "success" };
    case "cancelled":
      return { label: "Annulée", variant: "danger" };
    default:
      return { label: status, variant: "default" };
  }
}

export function frequencyLabel(freq: string): string {
  switch (freq) {
    case "once": return "Une seule fois";
    case "daily": return "Quotidien";
    case "weekly": return "Hebdomadaire";
    case "monthly": return "Mensuel";
    case "quarterly": return "Trimestriel";
    case "yearly": return "Annuel";
    default: return freq;
  }
}
