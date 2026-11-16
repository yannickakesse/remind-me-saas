import { msg } from "@/lib/i18n/catalog";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, msg("Le mot de passe est requis")),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Nom trop court"),
    email: z.string().email("Adresse email invalide"),
    password: z.string().min(8, msg("8 caractères minimum")),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: msg("Les mots de passe ne correspondent pas"),
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
