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

export async function updateAvatarUrl(url: string | null) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) throw new Error("Impossible d'enregistrer la photo de profil.");

  revalidatePath("/settings");
}

export async function updateNotificationPrefs(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = notifPrefsSchema.safeParse({
    email_enabled: formData.get("email_enabled") === "on",
    in_app_enabled: formData.get("in_app_enabled") === "on",
    activity_reminders: formData.get("activity_reminders") === "on",
    payment_reminders: formData.get("payment_reminders") === "on",
    expense_reminders: formData.get("expense_reminders") === "on",
    task_reminders: formData.get("task_reminders") === "on",
    conflict_alerts: formData.get("conflict_alerts") === "on",
    quiet_hours_enabled: formData.get("quiet_hours_enabled") === "on",
    quiet_hours_start: (formData.get("quiet_hours_start") as string) || "22:00",
    quiet_hours_end: (formData.get("quiet_hours_end") as string) || "08:00",
    preferred_locale: (formData.get("preferred_locale") as string) || "fr",
  });

  if (!parsed.success) throw new Error("Formulaire invalide.");

  // 1. Sauvegarder dans notification_preferences
  await supabase
    .from("notification_preferences")
    .upsert({
      user_id: user.id,
      email_enabled: parsed.data.email_enabled,
      in_app_enabled: parsed.data.in_app_enabled,
      activity_reminders: parsed.data.activity_reminders,
      payment_reminders: parsed.data.payment_reminders,
      expense_reminders: parsed.data.expense_reminders,
      task_reminders: parsed.data.task_reminders,
      conflict_alerts: parsed.data.conflict_alerts,
      quiet_hours_enabled: parsed.data.quiet_hours_enabled,
      quiet_hours_start: parsed.data.quiet_hours_start,
      quiet_hours_end: parsed.data.quiet_hours_end,
      preferred_locale: parsed.data.preferred_locale,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  // 2. Maintien de compatibilité avec user_settings
  await supabase
    .from("user_settings")
    .update({ notif_prefs: parsed.data })
    .eq("user_id", user.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
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

export async function signOutEverywhere() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

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
