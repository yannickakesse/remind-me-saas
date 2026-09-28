import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { EVENT_STATUS_STYLES, eventStatusLabel } from "@/lib/validation/calendar";
import { EventActions } from "@/components/calendar/event-actions";
import { setEventStatus, rescheduleEvent, deleteManualEvent } from "../actions";
import { resolveEntityNotifications } from "@/lib/notifications/engine";
import type { CalendarEventStatus } from "@/types/database";

import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { getUserTimezone } from "@/lib/time/timezones";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);
  const timezone = getUserTimezone(profile);
  const supabase = createClient();


  const { data: event } = await supabase
    .from("calendar_events")
    .select(
      "id, activity_id, schedule_id, title, starts_at, ends_at, status, is_exception, original_starts_at, notes, activities(name, color, type, work_mode, location, organizations(name))"
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!event) notFound();

  // Si l'événement est déjà terminé ou annulé, auto-résolution immédiate des alertes associées
  if (event.status === "completed" || event.status === "cancelled" || event.status === "missed") {
    await resolveEntityNotifications(supabase, event.id, user.id);
  }

  const activity = Array.isArray(event.activities) ? event.activities[0] : event.activities;
  const organization = activity && Array.isArray(activity.organizations)
    ? activity.organizations[0]
    : activity?.organizations;

  const start = DateTime.fromISO(event.starts_at, { zone: timezone });
  const end = DateTime.fromISO(event.ends_at, { zone: timezone });
  const isPastDue = start < DateTime.now().setZone(timezone);
  const workMode = activity?.work_mode;

  async function handleSetStatus(status: CalendarEventStatus) {
    "use server";
    await setEventStatus(event!.id, status);
  }

  async function handleReschedule(formData: FormData) {
    "use server";
    await rescheduleEvent(event!.id, formData);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Barre de navigation supérieure fluide */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-signal transition-colors py-1.5 px-3 rounded-full bg-canvas-raised border border-ink-200/80 shadow-xs tap-active"
        >
          <span>←</span>
          <span>Retour au calendrier</span>
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-signal hover:text-signal-dark transition-colors py-1.5 px-3.5 rounded-full bg-signal-soft/60 border border-signal/30 shadow-xs tap-active"
        >
          <span>Tableau de bord</span>
          <span>→</span>
        </Link>
      </div>

      <div className="rounded-3xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised p-6 sm:p-7 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: activity?.color ?? "#1E3A5F" }}
            />
            <div>
              <h1 className="text-xl font-semibold text-ink-950">{event.title}</h1>
              {organization?.name ? <p className="text-sm text-ink-500">{organization.name}</p> : null}
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${EVENT_STATUS_STYLES[event.status]}`}>
            {eventStatusLabel(event.status)}
          </span>
        </div>

        <div className="mb-6 flex flex-col gap-1 text-sm text-ink-700">
          <p className="capitalize">{start.setLocale("fr").toFormat("cccc d MMMM yyyy")}</p>
          <p>
            {start.toFormat("HH:mm")} – {end.toFormat("HH:mm")}
          </p>
          {activity?.location ? <p>{activity.location}</p> : null}
          {workMode ? (
            <p className="text-ink-500">
              {workMode === "remote" ? "À distance" : workMode === "onsite" ? "Sur site" : "Hybride"}
            </p>
          ) : null}
          {event.is_exception ? (
            <p className="text-xs text-warning">
              Occurrence reportée — horaire d'origine :{" "}
              {event.original_starts_at
                ? DateTime.fromISO(event.original_starts_at, { zone: timezone }).toFormat("d MMM 'à' HH:mm")
                : "inconnu"}
            </p>
          ) : null}
        </div>

        <EventActions
          status={event.status}
          isPastDue={isPastDue}
          defaultRescheduleValue={start.toFormat("yyyy-MM-dd'T'HH:mm")}
          onSetStatus={handleSetStatus}
          onReschedule={handleReschedule}
        />

        {!event.schedule_id ? (
          <form action={deleteManualEvent.bind(null, event.id)} className="mt-6 border-t border-ink-100 pt-4">
            <button type="submit" className="text-sm text-ink-500 hover:text-danger hover:underline">
              Supprimer cet événement ponctuel
            </button>
          </form>
        ) : (
          <p className="mt-6 border-t border-ink-100 pt-4 text-xs text-ink-500">
            Généré depuis les horaires de l'activité — annulez-le plutôt que de le supprimer pour ne pas le voir
            regénéré automatiquement.
          </p>
        )}
      </div>
    </div>
  );
}
