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

export const VALIDITY_TYPES = [
  { value: "permanent", label: "Permanent (durée indéfinie)" },
  { value: "temporary", label: "Engagement temporaire (date de fin obligatoire)" },
] as const;

export const ENGAGEMENT_NATURES = [
  { value: "routine", label: "Routine ou activité ordinaire" },
  { value: "temporary_engagement", label: "Engagement temporaire" },
  { value: "important", label: "Activité importante (priorité haute)" },
  { value: "one_time", label: "Activité ponctuelle" },
] as const;

export const REMINDER_PREFERENCES = [
  { value: "recommended", label: "Recommandation Remind Me (Recommandé)" },
  { value: "enabled", label: "Recevoir les rappels" },
  { value: "disabled", label: "Ne pas recevoir de rappels" },
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
  validityType: z.enum(["permanent", "temporary"]).default("permanent"),
  engagementNature: z.enum(["routine", "temporary_engagement", "important", "one_time"]).default("routine"),
  reminderPreference: z.enum(["enabled", "disabled", "recommended"]).default("recommended"),
  voiceReminderEnabled: z.boolean().default(true),
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

// ---- Schéma complet (soumission finale) avec validation conditionnelle -----
export const activityFormSchema = z
  .object({
    info: activityInfoSchema,
    organization: activityOrganizationSchema,
    schedule: activityScheduleSchema,
    compensation: activityCompensationSchema,
  })
  .refine(
    (data) => {
      // Si engagement temporaire, la date de fin est strictement requise
      if (data.info.validityType === "temporary") {
        return Boolean(data.schedule.endDate && data.schedule.endDate.trim().length > 0);
      }
      return true;
    },
    {
      message: "Une date de fin est obligatoire pour un engagement temporaire.",
      path: ["schedule", "endDate"],
    }
  )
  .refine(
    (data) => {
      // Si temporaire et les deux dates sont renseignées, la fin doit être >= début
      if (
        data.info.validityType === "temporary" &&
        data.schedule.startDate &&
        data.schedule.endDate
      ) {
        return data.schedule.endDate >= data.schedule.startDate;
      }
      return true;
    },
    {
      message: "La date de fin doit être égale ou postérieure à la date de début.",
      path: ["schedule", "endDate"],
    }
  );

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

/**
 * Extrait et valide les données d'un FormData pour le formulaire d'activité.
 * Utilisé directement par les Server Actions createActivity et updateActivity.
 */
export function parseActivityFormData(formData: FormData): ActivityFormInput {
  const rawSchedules = formData.get("schedulesJson");
  const schedules = rawSchedules ? JSON.parse(rawSchedules as string) : [];

  return activityFormSchema.parse({
    info: {
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      category: formData.get("category") || undefined,
      color: formData.get("color"),
      type: formData.get("type"),
      validityType: formData.get("validityType") || "permanent",
      engagementNature: formData.get("engagementNature") || "routine",
      reminderPreference: formData.get("reminderPreference") || "recommended",
      voiceReminderEnabled:
        formData.get("voiceReminderEnabled") === "on" ||
        formData.get("voiceReminderEnabled") === "true" ||
        formData.get("voiceReminderEnabled") === null,
    },
    organization: {
      organizationName: formData.get("organizationName") || undefined,
      contactName: formData.get("contactName") || undefined,
      contactPhone: formData.get("contactPhone") || undefined,
      contactEmail: formData.get("contactEmail") || undefined,
      address: formData.get("address") || undefined,
      workMode: formData.get("workMode") || undefined,
      location: formData.get("location") || undefined,
    },
    schedule: {
      variableHours: formData.get("variableHours") === "on",
      startDate: formData.get("startDate") || undefined,
      endDate: formData.get("endDate") || undefined,
      schedules,
    },
    compensation: {
      amount: formData.get("amount"),
      currency: formData.get("currency"),
      frequency: formData.get("frequency"),
      paymentDay: formData.get("paymentDay") || undefined,
      paymentTerms: formData.get("paymentTerms") || undefined,
    },
  });
}

/**
 * Construit le payload normalisé pour l'enregistrement en base de données.
 * Garantit que les activités permanentes ont toujours end_date = null.
 */
export function buildActivityPayload(
  parsed: ActivityFormInput,
  options?: {
    userId?: string;
    organizationId?: string | null;
    contactId?: string | null;
  }
) {
  const payload: Record<string, any> = {
    name: parsed.info.name,
    description: parsed.info.description || null,
    category: parsed.info.category || null,
    color: parsed.info.color,
    type: parsed.info.type,
    work_mode: parsed.organization.workMode || null,
    location: parsed.organization.location || null,
    start_date: parsed.schedule.startDate || null,
    end_date: parsed.info.validityType === "permanent" ? null : (parsed.schedule.endDate || null),
    validity_type: parsed.info.validityType,
    engagement_nature: parsed.info.engagementNature,
    reminder_preference: parsed.info.reminderPreference,
    voice_reminder_enabled: parsed.info.voiceReminderEnabled,
  };

  if (options?.userId) payload.user_id = options.userId;
  if (options && "organizationId" in options) payload.organization_id = options.organizationId;
  if (options && "contactId" in options) payload.contact_id = options.contactId;

  return payload;
}

