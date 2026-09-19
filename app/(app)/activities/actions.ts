"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { activityFormSchema } from "@/lib/validation/activities";
import { assertNoScheduleConflicts } from "@/lib/activities/schedules";

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

export async function archiveActivity(activityId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("activities")
    .update({ status: "archived" })
    .eq("id", activityId)
    .eq("user_id", user.id);

  revalidatePath("/activities");
  revalidatePath("/dashboard");
}

export async function restoreActivity(activityId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("activities")
    .update({ status: "active" })
    .eq("id", activityId)
    .eq("user_id", user.id);

  revalidatePath("/activities");
  revalidatePath("/dashboard");
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

    // 1. Supprimer les horaires associés
    await supabase
      .from("activity_schedules")
      .delete()
      .eq("activity_id", activityId)
      .eq("user_id", user.id);

    // 2. Supprimer les rémunérations associées
    await supabase
      .from("activity_compensation")
      .delete()
      .eq("activity_id", activityId)
      .eq("user_id", user.id);

    // 3. Supprimer les événements calendrier liés
    await supabase
      .from("calendar_events")
      .delete()
      .eq("activity_id", activityId)
      .eq("user_id", user.id);

    // 4. Supprimer l'activité
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (error) {
      return { error: "Impossible de supprimer cette activité." };
    }

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/finances");
    revalidatePath("/reports");
    return { success: true };
  } catch (err: any) {
    console.error("deleteActivity error:", err);
    return { error: err?.message || "Une erreur inattendue est survenue lors de la suppression." };
  }
}
