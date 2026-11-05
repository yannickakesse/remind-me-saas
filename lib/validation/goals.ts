import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null));

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

export const stepInputSchema = z.object({
  title: z.string().trim().min(1, "Donnez un titre à l'étape.").max(160),
  description: optionalText(1000),
  period: z.enum(["daily", "weekly", "monthly", "custom", "milestone"]).default("custom"),
  startDate: optionalDate,
  dueDate: optionalDate,
  targetValue: optionalNumber,
  weight: optionalNumber,
});
export type StepInput = z.input<typeof stepInputSchema>;

export const goalInputSchema = z
  .object({
    title: z.string().trim().min(1, "Donnez un titre à votre objectif.").max(160),
    description: optionalText(2000),
    domain: z.enum(["personal", "professional", "studies", "finance", "health_sport", "learning", "project", "other"]).default("personal"),
    motivation: optionalText(1000),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de début invalide."),
    dueDate: optionalDate,
    kind: z.enum(["quantitative", "qualitative"]).default("qualitative"),
    expectedResult: optionalText(500),
    unit: optionalText(40),
    startValue: optionalNumber,
    targetValue: optionalNumber,
    reminderFrequency: z.enum(["", "daily", "weekly", "monthly"]).optional().transform((v) => (v ? v : null)),
    reminderTime: z.string().optional().transform((v) => (v && /^\d{2}:\d{2}$/.test(v) ? v : null)),
    reminderWeekday: optionalNumber,
    color: optionalText(20),
    steps: z.array(stepInputSchema).max(60).optional(),
  })
  .superRefine((g, ctx) => {
    if (g.dueDate && g.dueDate < g.startDate) {
      ctx.addIssue({ code: "custom", path: ["dueDate"], message: "La date limite doit suivre la date de début." });
    }
    if (g.kind === "quantitative") {
      if (g.targetValue === null) {
        ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Indiquez la valeur cible à atteindre." });
      } else if (g.targetValue === (g.startValue ?? 0)) {
        ctx.addIssue({ code: "custom", path: ["targetValue"], message: "La cible doit être différente de la valeur de départ." });
      }
    }
  });
export type GoalInput = z.input<typeof goalInputSchema>;
