"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  activityFormSchema,
  parseActivityFormData,
  buildActivityPayload,
} from "@/lib/validation/activities";
import { assertNoScheduleConflicts } from "@/lib/activities/schedules";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { assertCanCreateActivity } from "@/lib/subscriptions/server";
import { resolveEntityNotifications, invalidateOutdatedEntityReminders, triggerProactiveReminders } from "@/lib/notifications/engine";
import { DateTime } from "luxon";

/**
 * Trouve une organisation existante par nom exact pour cet utilisateur,
 * ou la crée. Retourne null si aucun nom n'est fourni (activité sans
 * organisation, ex. entreprise personnelle).
 */
async function findOrCreateOrganization(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  name: string | undefined,
  address?: string
) {
  if (!name || !name.trim()) return null;

  const { data: existing } = await supabase
    .from("organizations")
    .select("id, address")
    .eq("user_id", userId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (existing) {
    if (address && address.trim() && existing.address !== address.trim()) {
      await supabase
        .from("organizations")
        .update({ address: address.trim() })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("organizations")
    .insert({
      user_id: userId,
      name: name.trim(),
      address: address && address.trim() ? address.trim() : null,
    })
    .select("id")
    .single();

  if (error) throw new Error("Impossible d'enregistrer l'organisation.");
  return created.id;
}

async function findOrCreateContact(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string | null,
  input: {
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
  }
) {
  if (!input.contactName || !input.contactName.trim()) return null;

  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", input.contactName.trim())
    .maybeSingle();

  if (existing) {
    await supabase
      .from("contacts")
      .update({
        organization_id: organizationId,
        phone: input.contactPhone || null,
        email: input.contactEmail || null,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      organization_id: organizationId,
      name: input.contactName.trim(),
      phone: input.contactPhone || null,
      email: input.contactEmail || null,
    })
    .select("id")
    .single();

  if (error) throw new Error("Impossible d'enregistrer le contact.");
  return created.id;
}

export async function createActivity(formData: FormData) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Non authentifié. Veuillez vous reconnecter." };
    }

    const parsed = parseActivityFormData(formData);

    // Vérifier les quotas du forfait d'abonnement
    try {
      await assertCanCreateActivity(supabase, user.id);
    } catch (quotaError: any) {
      return { error: quotaError.message || "Limite de votre forfait atteinte." };
    }

    // Vérifier l'absence de chevauchement d'horaires AVANT d'insérer en base
    if (!parsed.schedule.variableHours && parsed.schedule.schedules.length > 0) {
      try {
        await assertNoScheduleConflicts({
          supabase,
          userId: user.id,
          schedules: parsed.schedule.schedules,
        });
      } catch (confError: any) {
        return { error: confError.message || "Conflit d'horaires détecté." };
      }
    }

    const organizationId = await findOrCreateOrganization(
      supabase,
      user.id,
      parsed.organization.organizationName,
      parsed.organization.address
    );
    const contactId = await findOrCreateContact(supabase, user.id, organizationId, {
      contactName: parsed.organization.contactName,
      contactPhone: parsed.organization.contactPhone,
      contactEmail: parsed.organization.contactEmail,
    });

    const activityPayload = buildActivityPayload(parsed, {
      userId: user.id,
      organizationId,
      contactId,
    });

    let { data: activity, error: activityError } = await supabase
      .from("activities")
      .insert(activityPayload as any)
      .select("id")
      .single();

    if (activityError && activityError.message?.toLowerCase().includes("voice_reminder_enabled")) {
      delete activityPayload.voice_reminder_enabled;
      const retryResult = await supabase
        .from("activities")
        .insert(activityPayload as any)
        .select("id")
        .single();
      activity = retryResult.data;
      activityError = retryResult.error;
    }

    if (activityError || !activity) {
      return { error: "Impossible de créer l'activité. " + (activityError?.message || "") };
    }

    if (parsed.schedule.schedules.length > 0) {
      const { error: schedulesError } = await supabase.from("activity_schedules").insert(
        parsed.schedule.schedules.map((s) => ({
          activity_id: activity.id,
          user_id: user.id,
          weekday: s.weekday,
          start_time: s.startTime,
          end_time: s.endTime,
          break_minutes: s.breakMinutes,
          recurrence: s.recurrence,
          variable_hours: parsed.schedule.variableHours,
        }))
      );
      if (schedulesError) {
        return { error: "L'activité a été créée mais les horaires n'ont pas pu être enregistrés." };
      }
    }

    const { error: compensationError } = await supabase.from("activity_compensation").insert({
      activity_id: activity.id,
      user_id: user.id,
      amount: parsed.compensation.amount,
      currency: parsed.compensation.currency,
      frequency: parsed.compensation.frequency,
      payment_day: parsed.compensation.paymentDay || null,
      payment_terms: parsed.compensation.paymentTerms || null,
    });
    if (compensationError) {
      return { error: "L'activité a été créée mais la rémunération n'a pas pu être enregistrée." };
    }

    // Synchronisation immédiate des revenus du mois pour afficher aussitôt le revenu attendu
    try {
      const now = DateTime.now();
      const startOfMonth = now.startOf("month").toISODate()!;
      const endOfMonth = now.endOf("month").toISODate()!;
      await ensureIncomeEntries(supabase, user.id, startOfMonth, endOfMonth);
    } catch (syncErr) {
      console.error("createActivity sync error:", syncErr);
    }

    await triggerProactiveReminders(supabase, user.id);

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/finances");
    revalidatePath("/notifications");
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    console.error("createActivity error:", err);
    return { error: err?.message || "Une erreur inattendue est survenue." };
  }
}

export async function updateActivity(activityId: string, formData: FormData) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Non authentifié. Veuillez vous reconnecter." };
    }

    const parsed = parseActivityFormData(formData);

    // Vérifier l'absence de chevauchement d'horaires AVANT d'insérer ou mettre à jour en base
    if (!parsed.schedule.variableHours && parsed.schedule.schedules.length > 0) {
      try {
        await assertNoScheduleConflicts({
          supabase,
          userId: user.id,
          schedules: parsed.schedule.schedules,
          excludeActivityId: activityId,
        });
      } catch (confError: any) {
        return { error: confError.message || "Conflit d'horaires détecté." };
      }
    }

    const organizationId = await findOrCreateOrganization(
      supabase,
      user.id,
      parsed.organization.organizationName,
      parsed.organization.address
    );
    const contactId = await findOrCreateContact(supabase, user.id, organizationId, {
      contactName: parsed.organization.contactName,
      contactPhone: parsed.organization.contactPhone,
      contactEmail: parsed.organization.contactEmail,
    });

    const updatePayload = buildActivityPayload(parsed, {
      organizationId,
      contactId,
    });

    let { error: activityError } = await supabase
      .from("activities")
      .update(updatePayload as any)
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (activityError && activityError.message?.toLowerCase().includes("voice_reminder_enabled")) {
      delete updatePayload.voice_reminder_enabled;
      const retryResult = await supabase
        .from("activities")
        .update(updatePayload as any)
        .eq("id", activityId)
        .eq("user_id", user.id);
      activityError = retryResult.error;
    }

    if (activityError) {
      return { error: "Impossible de modifier l'activité : " + activityError.message };
    }

    // Horaires : suppression puis réinsertion propre
    await supabase.from("activity_schedules").delete().eq("activity_id", activityId);
    if (parsed.schedule.schedules.length > 0) {
      const { error: schedulesError } = await supabase.from("activity_schedules").insert(
        parsed.schedule.schedules.map((s) => ({
          activity_id: activityId,
          user_id: user.id,
          weekday: s.weekday,
          start_time: s.startTime,
          end_time: s.endTime,
          break_minutes: s.breakMinutes,
          recurrence: s.recurrence,
          variable_hours: parsed.schedule.variableHours,
        }))
      );
      if (schedulesError) {
        return { error: "Erreur lors de l'enregistrement des horaires : " + schedulesError.message };
      }
    }

    // Rémunération : upsert sécurisé
    const { error: compError } = await supabase
      .from("activity_compensation")
      .upsert(
        {
          activity_id: activityId,
          user_id: user.id,
          amount: parsed.compensation.amount,
          currency: parsed.compensation.currency,
          frequency: parsed.compensation.frequency,
          payment_day: parsed.compensation.paymentDay || null,
          payment_terms: parsed.compensation.paymentTerms || null,
        },
        { onConflict: "activity_id" }
      );

    if (compError) {
      return { error: "Erreur lors de l'enregistrement de la rémunération : " + compError.message };
    }

    // PROPAGATION IMMÉDIATE : Mettre à jour tous les revenus NON ENCAISSÉS de cette activité
    // pour que les nouvelles valeurs (ex: 20 000 FCFA au lieu de 375 000 FCFA) soient immédiatement
    // répercutées dans la table income sans aucune valeur résiduelle obsolète.
    await Promise.allSettled([
      supabase
        .from("income")
        .update({
          amount: parsed.compensation.amount,
          currency: parsed.compensation.currency,
          label: `${parsed.info.name} — ${parsed.compensation.frequency}`,
        })
        .eq("activity_id", activityId)
        .eq("received", false)
        .eq("user_id", user.id),
      adminSupabase
        .from("income")
        .update({
          amount: parsed.compensation.amount,
          currency: parsed.compensation.currency,
          label: `${parsed.info.name} — ${parsed.compensation.frequency}`,
        })
        .eq("activity_id", activityId)
        .eq("received", false)
        .eq("user_id", user.id),
    ]);

    // Déclencher la synchronisation globale des revenus pour recalculer et synchroniser les échéances
    try {
      const now = DateTime.now();
      const startOfMonth = now.startOf("month").toISODate()!;
      const endOfMonth = now.plus({ months: 1 }).endOf("month").toISODate()!;
      await ensureIncomeEntries(supabase, user.id, startOfMonth, endOfMonth);
    } catch (syncErr) {
      console.error("updateActivity sync error:", syncErr);
    }

    // Nettoyage proactif des futurs événements de calendrier "planned" pour cette activité
    // afin qu'ils soient synchronisés et régénérés fidèlement avec les nouveaux horaires lors du prochain affichage
    try {
      const nowIso = DateTime.now().toISO()!;
      await supabase
        .from("calendar_events")
        .delete()
        .eq("activity_id", activityId)
        .eq("status", "planned")
        .gte("starts_at", nowIso);
    } catch (calErr) {
      console.warn("updateActivity calendar cleanup warning:", calErr);
    }

    // Invalider les anciens rappels obsolètes pour recalculer les alertes selon le nouvel horaire
    await invalidateOutdatedEntityReminders(supabase, activityId, user.id);
    await triggerProactiveReminders(supabase, user.id);

    revalidatePath("/activities");
    revalidatePath(`/activities/${activityId}/edit`);
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/finances");
    revalidatePath("/notifications");
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    console.error("updateActivity error:", err);
    return { error: err?.message || "Une erreur inattendue est survenue." };
  }
}

export async function suspendActivity(activityId: string) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    await Promise.allSettled([
      adminSupabase
        .from("activities")
        .update({ status: "suspended" })
        .eq("id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activities")
        .update({ status: "suspended" })
        .eq("id", activityId)
        .eq("user_id", user.id),
    ]);

    await resolveEntityNotifications(supabase, activityId, user.id);

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/reports");
    revalidatePath("/calendar");
    revalidatePath("/notifications");
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors de la suspension de l'activité." };
  }
}

export async function resumeActivity(activityId: string) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    await Promise.allSettled([
      adminSupabase
        .from("activities")
        .update({ status: "active" })
        .eq("id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activities")
        .update({ status: "active" })
        .eq("id", activityId)
        .eq("user_id", user.id),
    ]);

    await triggerProactiveReminders(supabase, user.id);

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/reports");
    revalidatePath("/calendar");
    revalidatePath("/notifications");
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors de la réactivation de l'activité." };
  }
}

export async function archiveActivity(activityId: string) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    await Promise.allSettled([
      adminSupabase
        .from("activities")
        .update({ status: "archived" })
        .eq("id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activities")
        .update({ status: "archived" })
        .eq("id", activityId)
        .eq("user_id", user.id),
    ]);

    await resolveEntityNotifications(supabase, activityId, user.id);

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/reports");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors de l'archivage." };
  }
}

export async function renewActivity(
  activityId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    amount?: number;
    currency?: string;
  }
) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    // 1. Récupérer l'activité existante pour vérifier sa cohérence
    const { data: act, error: fetchErr } = await supabase
      .from("activities")
      .select("id, name, validity_type, engagement_nature, start_date, end_date, status")
      .eq("id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !act) {
      return { error: "Activité introuvable." };
    }

    // 2. Validation stricte de la date de fin
    if (!options?.endDate) {
      return { error: "Une nouvelle date de fin est obligatoire pour renouveler une activité temporaire." };
    }

    const effectiveStartDate = options.startDate || act.start_date;
    if (effectiveStartDate && options.endDate < effectiveStartDate) {
      return {
        error: `La nouvelle date de fin (${options.endDate}) ne peut pas précéder la date de début (${effectiveStartDate}).`,
      };
    }

    // 3. Vérifier les quotas du forfait si l'activité était inactive
    if (act.status !== "active") {
      try {
        await assertCanCreateActivity(supabase, user.id);
      } catch (quotaErr: any) {
        return { error: quotaErr.message || "Limite d'activités actives de votre forfait atteinte." };
      }
    }

    // 4. Mettre à jour l'activité en préservant validity_type = 'temporary' et engagement_nature
    const updatePayload: Record<string, any> = {
      status: "active",
      validity_type: "temporary", // Préservation stricte de la nature temporaire
      end_date: options.endDate,
      updated_at: new Date().toISOString(),
    };

    if (options?.startDate) updatePayload.start_date = options.startDate;

    await Promise.allSettled([
      adminSupabase.from("activities").update(updatePayload).eq("id", activityId).eq("user_id", user.id),
      supabase.from("activities").update(updatePayload).eq("id", activityId).eq("user_id", user.id),
    ]);

    if (options?.amount !== undefined) {
      const compUpdate: Record<string, any> = {
        amount: options.amount,
        updated_at: new Date().toISOString(),
      };
      if (options.currency) compUpdate.currency = options.currency;

      await Promise.allSettled([
        adminSupabase.from("activity_compensation").update(compUpdate).eq("activity_id", activityId).eq("user_id", user.id),
        supabase.from("activity_compensation").update(compUpdate).eq("activity_id", activityId).eq("user_id", user.id),
      ]);
    }

    // 5. Résoudre les notifications d'expiration en cours pour cette activité
    await resolveEntityNotifications(supabase, activityId, user.id);

    // 6. Synchronisation financière immédiate pour la nouvelle période
    try {
      const now = DateTime.now();
      const startOfMonth = now.startOf("month").toISODate()!;
      const endOfMonth = now.endOf("month").toISODate()!;
      await ensureIncomeEntries(supabase, user.id, startOfMonth, endOfMonth);
    } catch (syncErr) {
      console.error("[renewActivity] sync error:", syncErr);
    }

    // 7. Réactiver les rappels proactifs futurs
    await triggerProactiveReminders(supabase, user.id);

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/finances");
    revalidatePath("/reports");
    revalidatePath("/notifications");
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors du renouvellement de l'activité." };
  }
}

/**
 * Conserve une activité temporaire expirée sans la renouveler.
 * Respecte le choix de l'utilisateur et clôture les alertes d'expiration associées.
 */
export async function keepActivityExpired(activityId: string, notificationId?: string) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const nowIso = new Date().toISOString();

    // S'assurer que le statut est bien marqué comme 'expired'
    await Promise.allSettled([
      adminSupabase
        .from("activities")
        .update({ status: "expired", updated_at: nowIso })
        .eq("id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activities")
        .update({ status: "expired", updated_at: nowIso })
        .eq("id", activityId)
        .eq("user_id", user.id),
    ]);

    // Clôturer la notification d'expiration
    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          resolved_at: nowIso,
          actioned_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    } else {
      await resolveEntityNotifications(supabase, activityId, user.id);
    }

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors de la confirmation du statut expiré." };
  }
}

export async function restoreActivity(activityId: string) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    await Promise.allSettled([
      adminSupabase
        .from("activities")
        .update({ status: "active" })
        .eq("id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activities")
        .update({ status: "active" })
        .eq("id", activityId)
        .eq("user_id", user.id),
    ]);

    await triggerProactiveReminders(supabase, user.id);

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/reports");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors de la restauration." };
  }
}

export async function deleteActivity(activityId: string) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Non authentifié. Veuillez vous reconnecter." };
    }

    const adminSupabase = createAdminClient();

    // Auto-Stop & Résolution de toutes les alertes liées à cette activité
    await resolveEntityNotifications(supabase, activityId, user.id);

    // 1. Nettoyer les revenus et dépenses :
    // - Supprimer les revenus ATTENDUS / NON ENCAISSÉS (received = false) pour que les montants attendus reflètent immédiatement la réalité
    // - Détacher uniquement les revenus RÉELS déjà encaissés (received = true) pour préserver l'historique comptable
    await Promise.allSettled([
      // Supprimer revenus non encaissés liés à l'activité
      adminSupabase
        .from("income")
        .delete()
        .eq("activity_id", activityId)
        .eq("received", false)
        .eq("user_id", user.id),
      supabase
        .from("income")
        .delete()
        .eq("activity_id", activityId)
        .eq("received", false)
        .eq("user_id", user.id),

      // Détacher les revenus passés déjà encaissés
      adminSupabase
        .from("income")
        .update({ activity_id: null, compensation_id: null })
        .eq("activity_id", activityId)
        .eq("received", true)
        .eq("user_id", user.id),
      supabase
        .from("income")
        .update({ activity_id: null, compensation_id: null })
        .eq("activity_id", activityId)
        .eq("received", true)
        .eq("user_id", user.id),

      // Supprimer dépenses non payées
      adminSupabase
        .from("expenses")
        .delete()
        .eq("activity_id", activityId)
        .eq("paid", false)
        .eq("user_id", user.id),
      supabase
        .from("expenses")
        .delete()
        .eq("activity_id", activityId)
        .eq("paid", false)
        .eq("user_id", user.id),

      // Détacher dépenses déjà payées
      adminSupabase
        .from("expenses")
        .update({ activity_id: null })
        .eq("activity_id", activityId)
        .eq("paid", true)
        .eq("user_id", user.id),
      supabase
        .from("expenses")
        .update({ activity_id: null })
        .eq("activity_id", activityId)
        .eq("paid", true)
        .eq("user_id", user.id),

      // Dépenses programmées : préserver intégralement en détachant le lien d'activité
      adminSupabase
        .from("scheduled_expenses")
        .update({ activity_id: null })
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("scheduled_expenses")
        .update({ activity_id: null })
        .eq("activity_id", activityId)
        .eq("user_id", user.id),

      // Tâches
      adminSupabase
        .from("tasks")
        .update({ activity_id: null })
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("tasks")
        .update({ activity_id: null })
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
    ]);

    // 2. Supprimer les données dépendantes
    await Promise.allSettled([
      adminSupabase
        .from("activity_schedules")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
      adminSupabase
        .from("activity_compensation")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
      adminSupabase
        .from("calendar_events")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activity_schedules")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activity_compensation")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("calendar_events")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
    ]);

    // 3. Supprimer définitivement l'activité
    await Promise.allSettled([
      adminSupabase
        .from("activities")
        .delete()
        .eq("id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activities")
        .delete()
        .eq("id", activityId)
        .eq("user_id", user.id),
    ]);

    // 4. Vérifier si l'activité subsiste (au cas où la règle RLS distante n'est pas encore appliquée)
    const { data: remaining } = await supabase
      .from("activities")
      .select("id")
      .eq("id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (remaining) {
      // Fallback immédiat : on archive l'activité pour la faire disparaître immédiatement du tableau actif
      await Promise.allSettled([
        adminSupabase
          .from("activities")
          .update({ status: "archived" })
          .eq("id", activityId)
          .eq("user_id", user.id),
        supabase
          .from("activities")
          .update({ status: "archived" })
          .eq("id", activityId)
          .eq("user_id", user.id),
      ]);
    }

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/finances");
    revalidatePath("/reports");
    revalidatePath("/tasks");
    revalidatePath("/notifications");
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    console.error("deleteActivity error:", err);
    return { error: err?.message || "Une erreur inattendue est survenue lors de la suppression." };
  }
}

/**
 * Accepte la suggestion d'évolution vers une 'routine'.
 * 
 * Règles strictes :
 * - Choix explicite de l'utilisateur.
 * - Met à jour UNIQUEMENT engagement_nature = 'routine'.
 * - Préserve STRICTEMENT validity_type, type, status, dates, contacts et rémunérations.
 * - Marque la notification comme 'actioned'.
 */
export async function acceptEvolutionToRoutine(activityId: string, notificationId?: string) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const nowIso = new Date().toISOString();

    // 1. Mettre à jour l'engagement_nature vers 'routine' de manière sécurisée
    await Promise.allSettled([
      adminSupabase
        .from("activities")
        .update({
          engagement_nature: "routine",
          updated_at: nowIso,
        })
        .eq("id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("activities")
        .update({
          engagement_nature: "routine",
          updated_at: nowIso,
        })
        .eq("id", activityId)
        .eq("user_id", user.id),
    ]);

    // 2. Marquer la notification de suggestion comme 'actioned' et 'resolved'
    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "actioned",
          actioned_at: nowIso,
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    } else {
      // Clôturer toute suggestion active liée à cette activité
      await supabase
        .from("notifications")
        .update({
          status: "actioned",
          actioned_at: nowIso,
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("entity_id", activityId)
        .eq("kind", "activity_routine_suggestion")
        .eq("user_id", user.id);
    }

    // 3. Recalibrer les rappels avec les nouvelles règles adaptées à la routine
    await triggerProactiveReminders(supabase, user.id);

    revalidatePath("/activities");
    revalidatePath(`/activities/${activityId}/edit`);
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors de l'acceptation de l'évolution vers routine." };
  }
}

/**
 * Refuse ou reporte la suggestion d'évolution vers une 'routine'.
 * 
 * Règles strictes :
 * - Respect strict du refus de l'utilisateur : AUCUNE modification de l'activité.
 * - La notification est marquée 'dismissed' avec une période de répit (snoozeDays = 30 par défaut).
 * - La suggestion ne sera pas répétée à chaque chargement de page.
 */
export async function declineEvolutionSuggestion(
  activityId: string,
  notificationId?: string,
  snoozeDays: number = 30
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const now = DateTime.now();
    const nowIso = now.toISO()!;
    const snoozedUntil = now.plus({ days: snoozeDays }).toISO()!;

    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          snoozed_until: snoozedUntil,
          actioned_at: nowIso,
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          snoozed_until: snoozedUntil,
          actioned_at: nowIso,
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("entity_id", activityId)
        .eq("kind", "activity_routine_suggestion")
        .eq("user_id", user.id);
    }

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors du refus de la suggestion." };
  }
}

