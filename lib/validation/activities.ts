import { z } from "zod";

export const ACTIVITY_TYPES = [
  { value: "salaried_job", label: "Emploi salarié" },
  { value: "freelance", label: "Freelance" },
  { value: "contract", label: "Contrat" },
  { value: "mission", label: "Mission" },
  { value: "own_business", label: "Entreprise personnelle" },
  { value: "commerce", label: "Commerce" },
  { value: "coaching", label: "Coaching" },
  { value: "consulting", label: "Consultation" },
  { value: "teaching", label: "Cours" },
  { value: "side_activity", label: "Activité secondaire" },
  { value: "other", label: "Autre" },
] as const;

export const COMPENSATION_FREQUENCIES = [
  { value: "hourly", label: "Horaire" },
  { value: "daily", label: "Journalier" },
  { value: "per_session", label: "Par séance" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "biweekly", label: "Bihebdomadaire" },
  { value: "monthly", label: "Mensuel" },
  { value: "per_project", label: "Par projet" },
  { value: "one_time", label: "Ponctuel" },
] as const;

export const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
] as const;

// ---- Infos générales -------------------------------------------------------
export const activityInfoSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  description: z.string().optional(),
  category: z.string().optional(),
  color: z.string().min(1, "Choisissez une couleur"),
  type: z.enum([
    "salaried_job", "freelance", "contract", "mission", "own_business",
    "commerce", "coaching", "consulting", "teaching", "side_activity", "other",
  ]),
});

// ---- Organisation -----------------------------------------------------------
export const activityOrganizationSchema = z.object({
  organizationName: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return val;
  }, z.string().email("Email invalide").optional()),
  address: z.string().optional(),
  workMode: z.enum(["remote", "onsite", "hybrid"]).optional(),
  location: z.string().optional(),
});

// ---- Horaires ---------------------------------------------------------------
export const activityScheduleEntrySchema = z
  .object({
    weekday: z.coerce.number().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
    breakMinutes: z.preprocess((val) => {
      if (val === "" || val === undefined || val === null) return 0;
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    }, z.number().min(0).default(0)),
    recurrence: z.enum(["weekly", "biweekly", "custom"]).default("weekly"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["endTime"],
  });

export const activityScheduleSchema = z.object({
  variableHours: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  schedules: z.array(activityScheduleEntrySchema).default([]),
});

// ---- Rémunération -------------------------------------------------------
export const activityCompensationSchema = z.object({
  amount: z.preprocess((val) => {
    if (typeof val === "string") {
      const cleaned = val.replace(/\s+/g, "").replace(",", ".");
      const num = Number(cleaned);
      return isNaN(num) ? val : num;
    }
    return val;
  }, z.coerce.number().min(0, "Montant invalide")),
  currency: z.string().length(3, "Sélectionnez une devise"),
  frequency: z.enum([
    "hourly", "daily", "per_session", "weekly", "biweekly", "monthly",
    "per_project", "one_time",
  ]),
  paymentDay: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(1, "Le jour doit être compris entre 1 et 31").max(31, "Le jour doit être compris entre 1 et 31").optional()),
  paymentTerms: z.string().optional(),
});

// ---- Schéma complet (soumission finale) -------------------------------------
export const activityFormSchema = z.object({
  info: activityInfoSchema,
  organization: activityOrganizationSchema,
  schedule: activityScheduleSchema,
  compensation: activityCompensationSchema,
});

export type ActivityFormInput = z.infer<typeof activityFormSchema>;

export function activityTypeLabel(type?: string | null): string {
  switch (type) {
    case "salaried_job": return "Emploi salarié";
    case "freelance": return "Freelance";
    case "contract": return "Contrat";
    case "mission": return "Mission";
    case "own_business": return "Entreprise propre";
    case "commerce": return "Commerce";
    case "coaching": return "Coaching";
    case "consulting": return "Consulting";
    case "teaching": return "Enseignement";
    case "side_activity": return "Activité secondaire";
    default: return "Autre";
  }
}
export const typeLabel = activityTypeLabel;
