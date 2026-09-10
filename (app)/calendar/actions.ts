"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { manualEventSchema, rescheduleSchema } from "@/lib/validation/calendar";
import type { CalendarEventStatus } from "@/types/database";

async function requireUserWithTimezone() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  return { supabase, user, timezone: profile?.timezone ?? "UTC" };
}

/**
 * Change le statut d'exécution d'une occurrence. C'est le mécanisme derrière
 * la question "Avez-vous terminé cette activité ?" côté UI (terminé / manqué)
 * ainsi que les changements manuels (en cours, annulé...).
 */
export async function setEventStatus(eventId: string, status: CalendarEventStatus) {
  const { supabase, user } = await requireUserWithTimezone();

  const { error } = await supabase
    .from("calendar_events")
    .update({ status })
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de mettre à jour le statut de l'événement.");

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${eventId}`);
  revalidatePath("/dashboard");
}

/**
 * Déplace une occurrence à une nouvelle date/heure. La durée d'origine est
 * conservée. L'occurrence devient une exception : original_starts_at retient
 * l'horaire théorique (une seule fois — un second report ne l'écrase pas),
 * pour que la génération automatique ne recrée jamais de doublon.
 */
export async function rescheduleEvent(eventId: string, formData: FormData) {
  const { supabase, user, timezone } = await requireUserWithTimezone();

  const parsed = rescheduleSchema.parse({
    newStartsAt: formData.get("newStartsAt"),
  });

  const { data: current, error: fetchError } = await supabase
    .from("calendar_events")
    .select("starts_at, ends_at, original_starts_at")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !current) throw new Error("Événement introuvable.");

  const durationMs =
    DateTime.fromISO(current.ends_at).toMillis() - DateTime.fromISO(current.starts_at).toMillis();
  const newStart = DateTime.fromISO(parsed.newStartsAt, { zone: timezone });
  if (!newStart.isValid) throw new Error("Date invalide.");
  const newEnd = newStart.plus({ milliseconds: durationMs });

  const { error } = await supabase
    .from("calendar_events")
    .update({
      starts_at: newStart.toUTC().toISO(),
      ends_at: newEnd.toUTC().toISO(),
      status: "postponed",
      is_exception: true,
      original_starts_at: current.original_starts_at ?? current.starts_at,
    })
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de reporter cet événement.");

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${eventId}`);
}

export async function cancelEvent(eventId: string) {
  await setEventStatus(eventId, "cancelled");
}

/**
 * Crée un événement ponctuel non lié à un horaire récurrent (schedule_id
 * null) — par exemple un rendez-vous exceptionnel pour une activité donnée.
 */
export async function createManualEvent(formData: FormData) {
  const { supabase, user, timezone } = await requireUserWithTimezone();

  const parsed = manualEventSchema.parse({
    activityId: formData.get("activityId"),
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    notes: formData.get("notes") || undefined,
  });

  const startsAt = DateTime.fromISO(parsed.startsAt, { zone: timezone });
  const endsAt = DateTime.fromISO(parsed.endsAt, { zone: timezone });
  if (!startsAt.isValid || !endsAt.isValid || endsAt <= startsAt) {
    throw new Error("La période saisie est invalide.");
  }

  const { error } = await supabase.from("calendar_events").insert({
    user_id: user.id,
    activity_id: parsed.activityId,
    schedule_id: null,
    title: parsed.title,
    starts_at: startsAt.toUTC().toISO()!,
    ends_at: endsAt.toUTC().toISO()!,
    status: "planned",
    notes: parsed.notes || null,
  });

  if (error) throw new Error("Impossible de créer cet événement.");

  revalidatePath("/calendar");
}

/**
 * Supprime un événement manuel (schedule_id null uniquement) — un événement
 * généré depuis un horaire doit être annulé plutôt que supprimé, sous peine
 * d'être régénéré au prochain affichage du calendrier.
 */
export async function deleteManualEvent(eventId: string) {
  const { supabase, user } = await requireUserWithTimezone();

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id)
    .is("schedule_id", null);

  if (error) throw new Error("Impossible de supprimer cet événement.");

  revalidatePath("/calendar");
}
