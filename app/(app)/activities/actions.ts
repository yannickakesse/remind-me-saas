"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activityFormSchema } from "@/lib/validation/activities";
import { assertNoScheduleConflicts } from "@/lib/activities/schedules";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { assertCanCreateActivity } from "@/lib/subscriptions/server";
import { DateTime } from "luxon";

/**
 * Trouve une organisation existante par nom exact pour cet utilisateur,
 * ou la crée. Retourne null si aucun nom n'est fourni (activité sans
 * organisation, ex. entreprise personnelle).
 */
async function findOrCreateOrganization(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  name: string | undefined
) {
  if (!name || !name.trim()) return null;

  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("organizations")
    .insert({ user_id: userId, name: name.trim() })
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

function parseFormData(formData: FormData) {
  const rawSchedules = formData.get("schedulesJson");
  const schedules = rawSchedules ? JSON.parse(rawSchedules as string) : [];

  return activityFormSchema.parse({
    info: {
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      category: formData.get("category") || undefined,
      color: formData.get("color"),
      type: formData.get("type"),
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

export async function createActivity(formData: FormData) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Non authentifié. Veuillez vous reconnecter." };
    }

    const parsed = parseFormData(formData);

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
      parsed.organization.organizationName
    );
    const contactId = await findOrCreateContact(supabase, user.id, organizationId, {
      contactName: parsed.organization.contactName,
      contactPhone: parsed.organization.contactPhone,
      contactEmail: parsed.organization.contactEmail,
    });

    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .insert({
        user_id: user.id,
        name: parsed.info.name,
        description: parsed.info.description || null,
        category: parsed.info.category || null,
        color: parsed.info.color,
        type: parsed.info.type,
        organization_id: organizationId,
        contact_id: contactId,
        work_mode: parsed.organization.workMode || null,
        location: parsed.organization.location || null,
        start_date: parsed.schedule.startDate || null,
        end_date: parsed.schedule.endDate || null,
      })
      .select("id")
      .single();

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

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/finances");
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

    const parsed = parseFormData(formData);

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
      parsed.organization.organizationName
    );
    const contactId = await findOrCreateContact(supabase, user.id, organizationId, {
      contactName: parsed.organization.contactName,
      contactPhone: parsed.organization.contactPhone,
      contactEmail: parsed.organization.contactEmail,
    });

    const { error: activityError } = await supabase
      .from("activities")
      .update({
        name: parsed.info.name,
        description: parsed.info.description || null,
        category: parsed.info.category || null,
        color: parsed.info.color,
        type: parsed.info.type,
        organization_id: organizationId,
        contact_id: contactId,
        work_mode: parsed.organization.workMode || null,
        location: parsed.organization.location || null,
        start_date: parsed.schedule.startDate || null,
        end_date: parsed.schedule.endDate || null,
      })
      .eq("id", activityId)
      .eq("user_id", user.id);

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

    revalidatePath("/activities");
    revalidatePath(`/activities/${activityId}/edit`);
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/finances");
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
      // Supprimer immédiatement les revenus attendus non encaissés pour cette activité suspendue
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
    ]);

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/reports");
    revalidatePath("/calendar");
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

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/reports");
    revalidatePath("/calendar");
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
      // Supprimer les revenus attendus non encaissés pour cette activité archivée
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
    ]);

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/reports");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erreur lors de l'archivage." };
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

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/reports");
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

      // Dépenses programmées
      adminSupabase
        .from("scheduled_expenses")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", user.id),
      supabase
        .from("scheduled_expenses")
        .delete()
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
    return { success: true };
  } catch (err: any) {
    console.error("deleteActivity error:", err);
    return { error: err?.message || "Une erreur inattendue est survenue lors de la suppression." };
  }
}
