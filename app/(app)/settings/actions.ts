"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  let safeUrl: string | null = null;
  if (url) {
    const parsed = z.string().url().refine((val) => /^https?:\/\//i.test(val), "URL non sécurisée").safeParse(url);
    if (!parsed.success) {
      throw new Error("Format d'URL d'avatar invalide.");
    }
    safeUrl = parsed.data;
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: safeUrl }).eq("id", user.id);
  if (error) throw new Error("Impossible d'enregistrer la photo de profil.");

  revalidatePath("/settings");
}

export async function updateNotificationPrefs(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = notifPrefsSchema.safeParse({
    email_enabled: formData.get("email_enabled") === "on",
    in_app_enabled: formData.get("in_app_enabled") === "on",
    push_enabled: formData.get("push_enabled") === "on",
    activity_reminders: formData.get("activity_reminders") === "on",
    payment_reminders: formData.get("payment_reminders") === "on",
    expense_reminders: formData.get("expense_reminders") === "on",
    finance_reminders: formData.get("finance_reminders") === "on",
    task_reminders: formData.get("task_reminders") === "on",
    conflict_alerts: formData.get("conflict_alerts") === "on",
    quiet_hours_enabled: formData.get("quiet_hours_enabled") === "on",
    quiet_hours_start: (formData.get("quiet_hours_start") as string) || "22:00",
    quiet_hours_end: (formData.get("quiet_hours_end") as string) || "08:00",
    preferred_locale: (formData.get("preferred_locale") as string) || "fr",
    voice_reminders: formData.get("voice_reminders") === "on",
    voice_type: (formData.get("voice_type") as string) || "system",
    voice_language: (formData.get("voice_language") as string) || "fr",
    repeat_voice: formData.get("repeat_voice") ? Number(formData.get("repeat_voice")) : 0,
    voice_category_activities: formData.get("voice_category_activities") !== "off",
    voice_category_tasks: formData.get("voice_category_tasks") !== "off",
    voice_category_finances: formData.get("voice_category_finances") !== "off",
    voice_category_briefings: formData.get("voice_category_briefings") !== "off",
    voice_category_goals: formData.get("voice_category_goals") !== "off",
    voice_hide_financial_amounts: formData.get("voice_hide_financial_amounts") === "on",
    voice_include_user_name: formData.get("voice_include_user_name") !== "off",
    custom_voice_reminder_text: (formData.get("custom_voice_reminder_text") as string) || "",
    voice_playback_rate: formData.get("voice_playback_rate") ? Number(formData.get("voice_playback_rate")) : 1.0,
    voice_volume: formData.get("voice_volume") ? Number(formData.get("voice_volume")) : 1.0,
    first_reminder_minutes: formData.get("first_reminder_minutes") ? Number(formData.get("first_reminder_minutes")) : 30,
    second_reminder_minutes: formData.get("second_reminder_minutes") ? Number(formData.get("second_reminder_minutes")) : 10,
    daily_summary_time: (formData.get("daily_summary_time") as string) || "20:00",
  });

  if (!parsed.success) throw new Error("Formulaire invalide.");

  // 1. Sauvegarder dans notification_preferences
  const { error: upsertError } = await supabase
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
      voice_reminders: parsed.data.voice_reminders,
      voice_type: parsed.data.voice_type,
      voice_language: parsed.data.voice_language,
      repeat_voice: parsed.data.repeat_voice,
      voice_category_activities: parsed.data.voice_category_activities,
      voice_category_tasks: parsed.data.voice_category_tasks,
      voice_category_finances: parsed.data.voice_category_finances,
      voice_category_briefings: parsed.data.voice_category_briefings,
      voice_hide_financial_amounts: parsed.data.voice_hide_financial_amounts,
      voice_include_user_name: parsed.data.voice_include_user_name,
      custom_voice_reminder_text: parsed.data.custom_voice_reminder_text,
      voice_playback_rate: parsed.data.voice_playback_rate,
      first_reminder_minutes: parsed.data.first_reminder_minutes,
      second_reminder_minutes: parsed.data.second_reminder_minutes,
      daily_summary_time: parsed.data.daily_summary_time,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (upsertError) {
    // Fallback gracieux sans colonnes étendues si la table n'a pas encore été migrée
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
        voice_reminders: parsed.data.voice_reminders,
        voice_type: parsed.data.voice_type,
        voice_language: parsed.data.voice_language,
        repeat_voice: parsed.data.repeat_voice,
        first_reminder_minutes: parsed.data.first_reminder_minutes,
        second_reminder_minutes: parsed.data.second_reminder_minutes,
        daily_summary_time: parsed.data.daily_summary_time,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
  }

  // 2. Maintien de compatibilité avec user_settings (JSONB - stocke l'intégralité sans contrainte de schéma)
  await supabase
    .from("user_settings")
    .update({ notif_prefs: parsed.data })
    .eq("user_id", user.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function changePassword(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword") || undefined,
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  // Si l'utilisateur a renseigné son mot de passe actuel, on valide l'authenticité
  if (parsed.data.currentPassword && user.email) {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) {
      throw new Error("Le mot de passe actuel est incorrect.");
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) throw new Error(error.message || "Impossible de changer le mot de passe. Réessayez.");
}

export async function signOutEverywhere() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export async function deleteAccount() {
  const { supabase, user } = await requireUser();

  // Nettoyage préalable des fichiers de stockage (avatar) pour éviter le blocage de contrainte de clé étrangère
  try {
    const { data: files } = await supabase.storage.from("avatars").list(user.id);
    if (files && files.length > 0) {
      await supabase.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
    }
  } catch (e) {
    console.error("[deleteAccount] storage cleanup error:", e);
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw new Error("Impossible de supprimer le compte. Réessayez ou contactez le support.");

  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Remise à zéro du compte : efface le CONTENU de l'utilisateur connecté (activités, agenda,
 * tâches, finances, objectifs, clients, notifications) mais garde le compte lui-même :
 * connexion, profil, réglages, forfait payé et appareils abonnés aux notifications.
 * Ne touche QUE les lignes de cet utilisateur (filtre user_id issu de la session serveur).
 */
const RESET_TABLES_IN_ORDER = [
  "notification_logs",
  "notifications",
  "daily_summary_validations",
  "goal_progress_entries",
  "goal_steps",
  "goals",
  "savings_goals",
  "budgets",
  "income",
  "expenses",
  "scheduled_expenses",
  "tasks",
  "calendar_events",
  "activity_schedules",
  "activity_compensation",
  "activities",
  "contacts",
  "organizations",
] as const;

export async function resetAccountData() {
  const { user } = await requireUser();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Réinitialisation indisponible pour le moment. Réessayez plus tard.");
  }
  const admin = createAdminClient();

  for (const table of RESET_TABLES_IN_ORDER) {
    const { error } = await admin.from(table as never).delete().eq("user_id", user.id);
    if (error) {
      console.error(`[resetAccountData] ${table}:`, error.message);
      throw new Error("La réinitialisation n'a pas pu aller au bout. Réessayez : rien de ce qui reste n'est perdu.");
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Changement de forfait SANS paiement.
 * - Retour au forfait gratuit : toujours autorisé (résiliation).
 * - Forfait payant : uniquement si le mode démo est explicitement activé côté serveur
 *   (ENABLE_PLAN_DEMO=true). En production, seul le webhook Bictorys active un forfait payant.
 */
export async function updateSubscriptionPlan(newPlan: "free" | "pro" | "premium") {
  try {
    const { user } = await requireUser();

    if (newPlan !== "free" && process.env.ENABLE_PLAN_DEMO !== "true") {
      return { success: false, error: "Ce forfait s'active uniquement après paiement." };
    }

    // Écriture côté serveur uniquement (les utilisateurs n'ont plus le droit d'écrire cette table)
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan: newPlan,
        status: "active",
        current_period_end: null,
        provider: newPlan === "free" ? "manual" : "demo",
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id" }
    );
    if (error) throw new Error("Impossible de mettre à jour le forfait.");

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/activities");
    revalidatePath("/finances");
    revalidatePath("/reports");

    return { success: true, plan: newPlan };
  } catch (err: any) {
    console.error("[updateSubscriptionPlan] Erreur:", err?.message);
    return { success: false, error: err?.message || "Impossible de mettre à jour le forfait." };
  }
}

export async function initiateBictorysCheckoutAction(params: {
  targetPlan: "pro" | "premium";
  billingCycle: "monthly" | "yearly";
  baseUrl: string;
}): Promise<{ success: boolean; checkoutUrl?: string; chargeId?: string; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const { createBictorysCheckoutSession } = await import("@/lib/payments/bictorys");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    // Offre de bienvenue : décidée ici, côté serveur, d'après l'historique de paiement du compte
    const { getFirstMonthOfferEligible } = await import("@/lib/subscriptions/server");
    const firstMonthOffer = params.billingCycle === "monthly" && (await getFirstMonthOfferEligible(supabase, user.id));

    const result = await createBictorysCheckoutSession({
      firstMonthOffer,
      userId: user.id,
      userEmail: user.email || "",
      userName: profile?.full_name || undefined,
      plan: params.targetPlan,
      billingCycle: params.billingCycle,
      baseUrl: params.baseUrl,
    });

    return result;
  } catch (err: any) {
    console.error("[initiateBictorysCheckoutAction] Erreur:", err);
    return {
      success: false,
      error: err?.message || "Impossible d'initialiser le paiement Bictorys.",
    };
  }
}

