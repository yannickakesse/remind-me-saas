"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileFormSchema, passwordChangeSchema, notifPrefsSchema } from "@/lib/validation/settings";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = profileFormSchema.safeParse({
    fullName: formData.get("fullName"),
    countryCode: formData.get("countryCode"),
    currencyCode: formData.get("currencyCode"),
    timezone: formData.get("timezone"),
    locale: formData.get("locale"),
    weekStart: formData.get("weekStart"),
    timeFormat: formData.get("timeFormat"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      country_code: parsed.data.countryCode,
      default_currency: parsed.data.currencyCode,
      timezone: parsed.data.timezone,
      locale: parsed.data.locale,
      week_start: parsed.data.weekStart,
      time_format: parsed.data.timeFormat,
    })
    .eq("id", user.id);

  if (error) throw new Error("Impossible d'enregistrer le profil. Réessayez.");

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/**
 * Enregistre l'URL de l'avatar après upload côté client vers Supabase
 * Storage (le transfert du fichier lui-même se fait directement depuis le
 * navigateur — voir components/settings/profile-section.tsx — pour profiter
 * de la barre de progression native et ne pas faire transiter le binaire
 * par le serveur Next.js).
 */
export async function updateAvatarUrl(url: string | null) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) throw new Error("Impossible d'enregistrer la photo de profil.");

  revalidatePath("/settings");
}

export async function updateNotificationPrefs(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = notifPrefsSchema.safeParse({
    task_reminder: formData.get("task_reminder") === "on",
    task_overdue: formData.get("task_overdue") === "on",
    finance_overdue: formData.get("finance_overdue") === "on",
  });
  if (!parsed.success) throw new Error("Formulaire invalide.");

  const { error } = await supabase
    .from("user_settings")
    .update({ notif_prefs: parsed.data })
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible d'enregistrer vos préférences.");

  revalidatePath("/settings");
}

export async function changePassword(formData: FormData) {
  const { supabase } = await requireUser();

  const parsed = passwordChangeSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) throw new Error("Impossible de changer le mot de passe. Réessayez.");
}

/** §22 du prompt maître — déconnexion de toutes les sessions actives. */
export async function signOutEverywhere() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

/**
 * §97 — suppression de compte en libre-service, via la fonction Postgres
 * "security definer" `delete_own_account` (migration 0007) : le client ne
 * détient jamais de droit d'administration, seule cette fonction peut agir,
 * et uniquement sur le compte de l'appelant (auth.uid()).
 */
export async function deleteAccount() {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw new Error("Impossible de supprimer le compte. Réessayez ou contactez le support.");

  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateSubscriptionPlan(newPlan: "free" | "pro" | "premium") {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: user.id,
      plan: newPlan,
      status: "active",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) throw new Error("Impossible de mettre à jour le forfait.");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
