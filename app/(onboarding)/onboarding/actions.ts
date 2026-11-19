"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/onboarding";
import { USER_STATUS_VALUES } from "@/lib/profile/status";

export async function completeOnboarding(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    countryCode: formData.get("countryCode"),
    currencyCode: formData.get("currencyCode"),
    timezone: formData.get("timezone"),
    activityCountHint: formData.get("activityCountHint"),
  });

  if (!parsed.success) {
    // En Phase 1, on renvoie une erreur générique ; un retour de champ par
    // champ pourra être branché via useFormState si besoin en Phase 9 (qualité).
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  }

  const rawStatus = String(formData.get("status") || "");
  const profileUpdate: Record<string, any> = {
    full_name: parsed.data.fullName,
    country_code: parsed.data.countryCode,
    default_currency: parsed.data.currencyCode,
    timezone: parsed.data.timezone,
    onboarding_completed: true,
  };
  if (USER_STATUS_VALUES.includes(rawStatus)) profileUpdate.status = rawStatus;

  let { error } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
  // Colonne « status » pas encore créée (migration 0032) : le profil est enregistré sans elle
  if (error && "status" in profileUpdate && (error.message || "").toLowerCase().includes("status")) {
    delete profileUpdate.status;
    ({ error } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id));
  }

  if (error) {
    throw new Error("Impossible d'enregistrer votre profil. Réessayez.");
  }

  await supabase
    .from("user_settings")
    .update({ ui_prefs: { activity_count_hint: parsed.data.activityCountHint } })
    .eq("user_id", user.id);

  // Étape 6 (§7) : on enchaîne directement sur la création de la première
  // activité, maintenant que le module Activités est livré (Phase 2).
  redirect("/activities/new?onboarding=1");
}
