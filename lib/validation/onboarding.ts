import { z } from "zod";

// Étapes 1 à 4 du cahier des charges (§7). La création de la première
// activité (étapes 5-6) sera branchée en Phase 2, une fois le module
// Activités implémenté.
export const onboardingStepIdentitySchema = z.object({
  fullName: z.string().min(2, "Nom trop court"),
});

export const onboardingStepCountrySchema = z.object({
  countryCode: z.string().length(2, "Sélectionnez un pays"),
});

export const onboardingStepCurrencySchema = z.object({
  currencyCode: z.string().length(3, "Sélectionnez une devise"),
});

export const onboardingStepTimezoneSchema = z.object({
  timezone: z.string().min(1, "Sélectionnez un fuseau horaire"),
});

// Étape 5 (§7) : purement indicatif, aide à calibrer le message d'accueil
// du module Activités — stocké dans user_settings.ui_prefs, pas dans profiles.
export const onboardingStepActivityCountSchema = z.object({
  activityCountHint: z.enum(["one", "two_to_three", "four_plus"]),
});

export const onboardingSchema = onboardingStepIdentitySchema
  .merge(onboardingStepCountrySchema)
  .merge(onboardingStepCurrencySchema)
  .merge(onboardingStepTimezoneSchema)
  .merge(onboardingStepActivityCountSchema);

export type OnboardingInput = z.infer<typeof onboardingSchema>;
