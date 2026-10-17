import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";

function revalidateAppPaths() {
  try {
    revalidatePath("/notifications");
    revalidatePath("/messages");
    revalidatePath("/finances");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
  } catch {
    // ignore
  }
}

function successResponse(data: Record<string, any>) {
  revalidateAppPaths();
  return NextResponse.json({ success: true, ...data });
}

const quickActionSchema = z.object({
  action: z.enum([
    "mark_received",
    "mark_paid",
    "mark_task_done",
    "postpone_task",
    "mark_event_done",
    "mark_event_completed",
    "mark_event_cancelled",
    "mark_event_missed",
    "postpone_event",
    "accept_evolution",
    "decline_evolution",
    "keep_expired",
    "renew_activity",
    "snooze",
    "mark_read",
    "dismiss",
  ]),
  notificationId: z.string().optional(),
  entityId: z.string().optional(),
  hours: z.number().positive().max(720).optional(),
  endDate: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
});

async function resolveNotifHelper(
  supabase: any,
  userId: string,
  nowIso: string,
  entityId?: string,
  notificationId?: string
) {
  if (entityId) {
    const { error } = await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        actioned_at: nowIso,
        read_at: nowIso,
      })
      .eq("user_id", userId)
      .eq("entity_id", entityId);

    if (error) {
      await supabase
        .from("notifications")
        .update({ status: "dismissed", read_at: nowIso })
        .eq("user_id", userId)
        .eq("entity_id", entityId);
    }
  }

  if (notificationId) {
    const { error } = await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        actioned_at: nowIso,
        read_at: nowIso,
      })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      await supabase
        .from("notifications")
        .update({ status: "dismissed", read_at: nowIso })
        .eq("id", notificationId)
        .eq("user_id", userId);
    }
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const parsed = quickActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const { action, notificationId, entityId, hours, endDate, amount, currency } = parsed.data;
    const nowIso = new Date().toISOString();
    const todayDate: string = nowIso.split("T")[0] || "";

    // 1. MARQUER REVENU / PAIEMENT ENCAISSÉ
    if (action === "mark_received" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant du revenu manquant" }, { status: 400 });
      }

      // Vérification d'existence et idempotence
      const { data: curInc, error: fetchErr } = await supabase
        .from("income")
        .select("id, received")
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr || !curInc) {
        return NextResponse.json({ error: "Revenu introuvable" }, { status: 404 });
      }

      // Si déjà encaissé, opération idempotente
      if (!curInc.received) {
        const { error: incError } = await supabase
          .from("income")
          .update({ received: true, received_at: todayDate })
          .eq("id", targetId)
          .eq("user_id", user.id);

        if (incError) {
          return NextResponse.json({ error: "Échec de l'encaissement: " + incError.message }, { status: 500 });
        }
      }

      // Résolution de la notification UNIQUEMENT si l'opération métier a réussi
      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "mark_received" });
    }

    // 2. MARQUER DÉPENSE OU DÉPENSE PROGRAMMÉE COMME PAYÉE
    if (action === "mark_paid" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de la dépense manquant" }, { status: 400 });
      }

      // Anti-double-clic : si la notification est déjà résolue ou traitée, ignorer le second clic
      if (notificationId) {
        const { data: curNotif } = await supabase
          .from("notifications")
          .select("status")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (curNotif && (curNotif.status === "resolved" || curNotif.status === "actioned")) {
          return successResponse({ action: "mark_paid", duplicateIgnored: true });
        }
      }

      // Vérifier si c'est une dépense directe existante dans `expenses`
      const { data: exp } = await supabase
        .from("expenses")
        .select("id, paid")
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (exp) {
        if (!exp.paid) {
          const { error: expError } = await supabase
            .from("expenses")
            .update({ paid: true, paid_at: todayDate })
            .eq("id", targetId)
            .eq("user_id", user.id);

          if (expError) {
            return NextResponse.json({ error: "Échec du règlement de la dépense: " + expError.message }, { status: 500 });
          }
        }
      } else {
        // Sinon, vérifier s'il s'agit d'une échéance dans `scheduled_expenses`
        const { data: sch, error: schErr } = await supabase
          .from("scheduled_expenses")
          .select("*")
          .eq("id", targetId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (schErr || !sch) {
          return NextResponse.json({ error: "Dépense ou échéance introuvable" }, { status: 404 });
        }

        const effectiveDueDate: string = sch.next_due_date || todayDate;

        // Idempotence & anti-double-clic pour échéance unique déjà payée
        if (sch.frequency === "once" && sch.status === "paid") {
          await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
          return successResponse({ action: "mark_paid", idempotent: true });
        }

        // Anti-double-clic temporel : vérifier si un règlement identique vient d'être enregistré il y a moins de 15s
        const { data: recentExp } = await supabase
          .from("expenses")
          .select("id, created_at")
          .eq("user_id", user.id)
          .eq("label", sch.name || "Dépense programmée")
          .eq("amount", Number(sch.amount) || 0)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentExp && recentExp.created_at) {
          const diffSec = (Date.now() - new Date(recentExp.created_at).getTime()) / 1000;
          if (diffSec < 15) {
            await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
            return successResponse({ action: "mark_paid", duplicateIgnored: true });
          }
        }

        // Anti-double-clic par échéance : vérifier si la dépense a déjà été insérée pour cette échéance exacte
        const { data: existingExp } = await supabase
          .from("expenses")
          .select("id")
          .eq("user_id", user.id)
          .eq("due_date", effectiveDueDate)
          .eq("amount", Number(sch.amount) || 0)
          .eq("label", sch.name || "Dépense programmée")
          .maybeSingle();

        if (!existingExp) {
          const { error: insertErr } = await supabase.from("expenses").insert({
            user_id: user.id,
            label: sch.name || "Dépense programmée",
            category: sch.category || "other",
            amount: Number(sch.amount) || 0,
            currency: sch.currency || "XOF",
            due_date: effectiveDueDate,
            paid: true,
            paid_at: todayDate,
            activity_id: sch.activity_id || null,
            notes: "Règlement effectué depuis le centre de notifications",
          });

          if (insertErr) {
            return NextResponse.json({ error: "Échec de l'enregistrement de la dépense: " + insertErr.message }, { status: 500 });
          }
        }

        // Mettre à jour l'échéancier
        if (sch.frequency === "once") {
          const { error: updErr } = await supabase
            .from("scheduled_expenses")
            .update({ status: "paid" })
            .eq("id", targetId)
            .eq("user_id", user.id);

          if (updErr) {
            return NextResponse.json({ error: "Échec de clôture de l'échéance: " + updErr.message }, { status: 500 });
          }
        } else {
          const curDT = DateTime.fromISO(effectiveDueDate);
          let nextDT = curDT;
          if (sch.frequency === "daily") nextDT = curDT.plus({ days: 1 });
          else if (sch.frequency === "weekly") nextDT = curDT.plus({ weeks: 1 });
          else if (sch.frequency === "monthly") nextDT = curDT.plus({ months: 1 });
          else if (sch.frequency === "quarterly") nextDT = curDT.plus({ months: 3 });
          else if (sch.frequency === "yearly") nextDT = curDT.plus({ years: 1 });
          else nextDT = curDT.plus({ months: 1 });

          const nextDueDateStr = nextDT.toISODate()!;

          // Respect strict des dates de contrat et d'expiration
          if (sch.end_date && nextDueDateStr > sch.end_date) {
            const { error: updErr } = await supabase
              .from("scheduled_expenses")
              .update({
                status: "paid",
              })
              .eq("id", targetId)
              .eq("user_id", user.id);

            if (updErr) {
              return NextResponse.json({ error: "Échec de clôture de l'échéance expirée: " + updErr.message }, { status: 500 });
            }
          } else {
            const { error: updErr } = await supabase
              .from("scheduled_expenses")
              .update({
                next_due_date: nextDueDateStr,
                status: "planned",
              })
              .eq("id", targetId)
              .eq("user_id", user.id);

            if (updErr) {
              return NextResponse.json({ error: "Échec de programmation de l'échéance suivante: " + updErr.message }, { status: 500 });
            }
          }
        }
      }

      // Résolution de la notification UNIQUEMENT après succès métier
      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "mark_paid" });
    }

    // 3. MARQUER UNE TÂCHE COMME TERMINÉE
    if (action === "mark_task_done" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de la tâche manquant" }, { status: 400 });
      }

      const { data: curTask, error: fetchErr } = await supabase
        .from("tasks")
        .select("id, status")
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr || !curTask) {
        return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
      }

      if (curTask.status !== "done") {
        const { error: taskError } = await supabase
          .from("tasks")
          .update({ status: "done", completed_at: nowIso })
          .eq("id", targetId)
          .eq("user_id", user.id);

        if (taskError) {
          return NextResponse.json({ error: "Échec de validation de la tâche: " + taskError.message }, { status: 500 });
        }
      }

      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "mark_task_done" });
    }

    // 3b. REPORTER UNE TÂCHE (+1 JOUR)
    if (action === "postpone_task" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de la tâche manquant" }, { status: 400 });
      }

      const { data: curTask, error: fetchErr } = await supabase
        .from("tasks")
        .select("id, due_date, due_time")
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr || !curTask) {
        return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
      }

      const curDateStr = curTask.due_date && curTask.due_date >= todayDate ? curTask.due_date : todayDate;
      const nextDueStr = DateTime.fromISO(curDateStr).plus({ days: 1 }).toISODate() || todayDate;

      const { error: taskError } = await supabase
        .from("tasks")
        .update({ due_date: nextDueStr, status: "todo" })
        .eq("id", targetId)
        .eq("user_id", user.id);

      if (taskError) {
        return NextResponse.json({ error: "Impossible de reporter la tâche: " + taskError.message }, { status: 500 });
      }

      const snoozedUntil = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      if (notificationId) {
        await supabase
          .from("notifications")
          .update({ status: "snoozed", snoozed_until: snoozedUntil })
          .eq("id", notificationId)
          .eq("user_id", user.id);
      }
      if (targetId) {
        await supabase
          .from("notifications")
          .update({ status: "snoozed", snoozed_until: snoozedUntil })
          .eq("entity_id", targetId)
          .eq("user_id", user.id);
      }

      return successResponse({ action: "postpone_task", newDueDate: nextDueStr });
    }

    // 4. MARQUER UNE SÉANCE DU CALENDRIER COMME TERMINÉE
    if ((action === "mark_event_done" || action === "mark_event_completed") && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de la séance manquant" }, { status: 400 });
      }

      const { data: evt, error: fetchEvtErr } = await supabase
        .from("calendar_events")
        .select("id, status")
        .or(`id.eq.${targetId},activity_id.eq.${targetId}`)
        .eq("user_id", user.id)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchEvtErr || !evt) {
        return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });
      }

      if (evt.status !== "completed") {
        const { error: updateErr } = await supabase
          .from("calendar_events")
          .update({ status: "completed", updated_at: nowIso })
          .eq("id", evt.id)
          .eq("user_id", user.id);

        if (updateErr) {
          return NextResponse.json({ error: "Impossible de terminer la séance: " + updateErr.message }, { status: 500 });
        }
      }

      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "mark_event_completed" });
    }

    // 5. ANNULER UN ÉVÉNEMENT DU CALENDRIER
    if (action === "mark_event_cancelled" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de la séance manquant" }, { status: 400 });
      }

      const { error: calErr } = await supabase
        .from("calendar_events")
        .update({ status: "cancelled", updated_at: nowIso })
        .or(`id.eq.${targetId},activity_id.eq.${targetId}`)
        .eq("user_id", user.id);

      if (calErr) {
        return NextResponse.json({ error: "Impossible d'annuler la séance: " + calErr.message }, { status: 500 });
      }

      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "mark_event_cancelled" });
    }

    // 5b. MARQUER UN ÉVÉNEMENT DU CALENDRIER COMME MANQUÉ
    if (action === "mark_event_missed" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de la séance manquant" }, { status: 400 });
      }

      const { data: evt, error: fetchEvtErr } = await supabase
        .from("calendar_events")
        .select("id, status")
        .or(`id.eq.${targetId},activity_id.eq.${targetId}`)
        .eq("user_id", user.id)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchEvtErr || !evt) {
        return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });
      }

      if (evt.status !== "missed") {
        const { error: updateErr } = await supabase
          .from("calendar_events")
          .update({ status: "missed", updated_at: nowIso })
          .eq("id", evt.id)
          .eq("user_id", user.id);

        if (updateErr) {
          return NextResponse.json({ error: "Impossible d'enregistrer la séance manquée: " + updateErr.message }, { status: 500 });
        }
      }

      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "mark_event_missed" });
    }

    // 5c. REPORTER UNE SÉANCE DU CALENDRIER (POSTPONE)
    if (action === "postpone_event" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de la séance manquant" }, { status: 400 });
      }

      const postponeHours = hours && hours > 0 ? hours : 2;
      const nowMs = Date.now();

      const { data: evt, error: fetchEvtErr } = await supabase
        .from("calendar_events")
        .select("id, starts_at, ends_at, original_starts_at")
        .or(`id.eq.${targetId},activity_id.eq.${targetId}`)
        .eq("user_id", user.id)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchEvtErr || !evt) {
        return NextResponse.json({ error: "Séance introuvable pour le report" }, { status: 404 });
      }

      const curStart = new Date(evt.starts_at);
      const curEnd = new Date(evt.ends_at);
      const durationMs = Math.max(1800000, curEnd.getTime() - curStart.getTime());

      const baseStartMs = curStart.getTime() < nowMs ? nowMs : curStart.getTime();
      const newStart = new Date(baseStartMs + postponeHours * 3600 * 1000);
      const newEnd = new Date(newStart.getTime() + durationMs);

      const { error: updateErr } = await supabase
        .from("calendar_events")
        .update({
          status: "postponed",
          starts_at: newStart.toISOString(),
          ends_at: newEnd.toISOString(),
          is_exception: true,
          original_starts_at: evt.original_starts_at || evt.starts_at,
          updated_at: nowIso,
        })
        .eq("id", evt.id)
        .eq("user_id", user.id);

      if (updateErr) {
        return NextResponse.json({ error: "Impossible de reporter la séance: " + updateErr.message }, { status: 500 });
      }

      const snoozedUntil = newStart.toISOString();

      // Mettre la notification en rappel reporté
      if (notificationId) {
        await supabase
          .from("notifications")
          .update({
            status: "snoozed",
            snoozed_until: snoozedUntil,
          })
          .eq("id", notificationId)
          .eq("user_id", user.id);
      }
      if (targetId) {
        await supabase
          .from("notifications")
          .update({
            status: "snoozed",
            snoozed_until: snoozedUntil,
          })
          .eq("entity_id", targetId)
          .eq("user_id", user.id);
      }

      return successResponse({ action: "postpone_event", snoozedUntil });
    }

    // 5d. ACCEPTER L'ÉVOLUTION D'UNE ACTIVITÉ VERS UNE ROUTINE
    if (action === "accept_evolution" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de l'activité manquant" }, { status: 400 });
      }

      const { data: act, error: fetchActErr } = await supabase
        .from("activities")
        .select("id, status")
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchActErr || !act) {
        return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
      }

      const { error: actErr } = await supabase
        .from("activities")
        .update({
          engagement_nature: "routine",
          updated_at: nowIso,
        })
        .eq("id", targetId)
        .eq("user_id", user.id);

      if (actErr) {
        return NextResponse.json({ error: "Impossible de faire évoluer l'activité: " + actErr.message }, { status: 500 });
      }

      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "accept_evolution" });
    }

    // 5e. REFUSER L'ÉVOLUTION D'UNE ACTIVITÉ (RÉPIT / SNOOZE 30 JOURS)
    if (action === "decline_evolution" && (entityId || notificationId)) {
      const snoozedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (notificationId) {
        const { error: notifErr } = await supabase
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

        if (notifErr) {
          return NextResponse.json({ error: "Erreur lors du répit: " + notifErr.message }, { status: 500 });
        }
      }
      if (entityId) {
        await supabase
          .from("notifications")
          .update({
            status: "dismissed",
            snoozed_until: snoozedUntil,
            actioned_at: nowIso,
            resolved_at: nowIso,
            read_at: nowIso,
          })
          .eq("entity_id", entityId)
          .eq("kind", "activity_routine_suggestion")
          .eq("user_id", user.id);
      }
      return successResponse({ action: "decline_evolution", snoozedUntil });
    }

    // 5f. CONSERVER L'ACTIVITÉ EXPIRÉE (REFUS DE RENOUVELLEMENT SANS PROLONGATION)
    if (action === "keep_expired" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de l'activité manquant" }, { status: 400 });
      }

      const { data: act, error: fetchActErr } = await supabase
        .from("activities")
        .select("id, status")
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchActErr || !act) {
        return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
      }

      const { error: actErr } = await supabase
        .from("activities")
        .update({ status: "expired", updated_at: nowIso })
        .eq("id", targetId)
        .eq("user_id", user.id);

      if (actErr) {
        return NextResponse.json({ error: "Impossible de clore l'activité: " + actErr.message }, { status: 500 });
      }

      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "keep_expired" });
    }

    // 5g. RENOUVELER UNE ACTIVITÉ TEMPORAIRE (RENEW_ACTIVITY)
    if (action === "renew_activity" && (entityId || notificationId)) {
      let targetId = entityId;
      if (!targetId && notificationId) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("id", notificationId)
          .eq("user_id", user.id)
          .maybeSingle();
        targetId = notif?.entity_id;
      }

      if (!targetId) {
        return NextResponse.json({ error: "Identifiant de l'activité manquant" }, { status: 400 });
      }

      if (!endDate) {
        return NextResponse.json({ error: "Une nouvelle date d'échéance est obligatoire pour renouveler l'activité." }, { status: 400 });
      }

      const { data: act, error: fetchActErr } = await supabase
        .from("activities")
        .select("id, name, start_date, end_date, status, validity_type")
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchActErr || !act) {
        return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
      }

      const effectiveStart = act.start_date || todayDate;
      if (endDate < effectiveStart) {
        return NextResponse.json({ error: `La nouvelle date de fin (${endDate}) ne peut pas précéder la date de début (${effectiveStart}).` }, { status: 400 });
      }

      // Mise à jour de l'activité avec conservation stricte du statut temporaire
      const { error: updErr } = await supabase
        .from("activities")
        .update({
          status: "active",
          validity_type: "temporary",
          end_date: endDate,
          updated_at: nowIso,
        })
        .eq("id", targetId)
        .eq("user_id", user.id);

      if (updErr) {
        return NextResponse.json({ error: "Échec du renouvellement: " + updErr.message }, { status: 500 });
      }

      // Mise à jour de compensation optionnelle si spécifiée
      if (amount !== undefined && amount > 0) {
        const compPayload: Record<string, any> = {
          amount,
          updated_at: nowIso,
        };
        if (currency) compPayload.currency = currency;
        await supabase
          .from("activity_compensation")
          .update(compPayload)
          .eq("activity_id", targetId)
          .eq("user_id", user.id);
      }

      // Résolution de la notification UNIQUEMENT après succès métier
      await resolveNotifHelper(supabase, user.id, nowIso, targetId, notificationId);
      return successResponse({ action: "renew_activity", endDate });
    }

    // 6. REPORTER (SNOOZE) UNE NOTIFICATION
    if (action === "snooze" && notificationId) {
      const snoozeHours = hours ?? 24;
      const snoozedUntil = new Date(Date.now() + snoozeHours * 60 * 60 * 1000).toISOString();

      const { error: snoozeErr } = await supabase
        .from("notifications")
        .update({
          status: "snoozed",
          snoozed_until: snoozedUntil,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (snoozeErr) {
        return NextResponse.json({ error: "Impossible de reporter la notification: " + snoozeErr.message }, { status: 500 });
      }

      return successResponse({ action: "snooze", snoozedUntil });
    }

    // 7. MARQUER COMME LUE
    if (action === "mark_read" && notificationId) {
      const { error: readErr } = await supabase
        .from("notifications")
        .update({
          status: "read",
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (readErr) {
        return NextResponse.json({ error: "Impossible de marquer comme lu: " + readErr.message }, { status: 500 });
      }

      return successResponse({ action: "mark_read" });
    }

    // 8. ÉCARTER (DISMISS) UNE NOTIFICATION
    if (action === "dismiss" && notificationId) {
      const { error: disErr } = await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          resolved_at: nowIso,
          actioned_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (disErr) {
        return NextResponse.json({ error: "Impossible d'écarter la notification: " + disErr.message }, { status: 500 });
      }

      if (entityId) {
        await supabase
          .from("notifications")
          .update({
            status: "dismissed",
            resolved_at: nowIso,
            actioned_at: nowIso,
            read_at: nowIso,
          })
          .eq("entity_id", entityId)
          .eq("user_id", user.id);
      }

      return successResponse({ action: "dismiss" });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    console.error("Erreur quick-action notification:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

