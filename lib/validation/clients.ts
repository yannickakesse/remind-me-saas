import { z } from "zod";

export const organizationFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  address: z.string().optional(),
});
export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export const contactFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  notes: z.string().optional(),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;
