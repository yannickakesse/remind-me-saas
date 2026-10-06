import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const quickActionSchema = z.object({
  action: z.enum([
    "mark_received",
    "mark_paid",
    "mark_task_done",
    "mark_event_done",
    "mark_event_completed",
    "mark_event_cancelled",
    "snooze",
    "mark_read",
    "dismiss",
  ]),
  notificationId: z.string().optional(),
  entityId: z.string().optional(),
  hours: z.number().positive().max(720).optional(),
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

    const { action, notificationId, entityId, hours } = parsed.data;
    const nowIso = new Date().toISOString();
    const todayDate: string = nowIso.split("T")[0] || "";

    // 1. MARQUER REVENU / PAIEMENT ENCAISSÉ
    if (action === "mark_received" && entityId) {
      await supabase
        .from("income")
        .update({ received: true, received_at: todayDate })
        .eq("id", entityId)
        .eq("user_id", user.id);

      await resolveNotifHelper(supabase, user.id, nowIso, entityId, notificationId);
      return NextResponse.json({ success: true, action: "mark_received" });
    }

    // 2. MARQUER DÉPENSE OU DÉPENSE PROGRAMMÉE COMME PAYÉE
    if (action === "mark_paid" && entityId) {
      const { data: exp } = await supabase
        .from("expenses")
        .select("id")
        .eq("id", entityId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (exp) {
        await supabase
          .from("expenses")
          .update({ paid: true, paid_at: todayDate })
          .eq("id", entityId)
          .eq("user_id", user.id);
      } else {
        const { data: sch } = await supabase
          .from("scheduled_expenses")
          .select("*")
          .eq("id", entityId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (sch) {
          const effectiveDueDate: string = sch.next_due_date || todayDate;
          await supabase.from("expenses").insert({
            user_id: user.id,
            label: sch.name || "Dépense programmée",
            category: sch.category || "other",
            amount: Number(sch.amount) || 0,
            currency: sch.currency || "XOF",
            due_date: effectiveDueDate,
            paid: true,
            activity_id: sch.activity_id || null,
            notes: "Règlement effectué depuis le tableau de bord",
          });

          if (sch.frequency === "once") {
            await supabase
              .from("scheduled_expenses")
              .update({ status: "paid" })
              .eq("id", entityId)
              .eq("user_id", user.id);
          } else {
            const curDate = new Date(effectiveDueDate);
            const nextDate = new Date(curDate);
            if (sch.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
            else if (sch.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
            else if (sch.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
            else if (sch.frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
            else if (sch.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
            else nextDate.setMonth(nextDate.getMonth() + 1);

            const nextDueDateStr = nextDate.toISOString().split("T")[0];

            await supabase
              .from("scheduled_expenses")
              .update({
                next_due_date: nextDueDateStr,
                status: "planned",
              })
              .eq("id", entityId)
              .eq("user_id", user.id);
          }
        }
      }

      await resolveNotifHelper(supabase, user.id, nowIso, entityId, notificationId);
      return NextResponse.json({ success: true, action: "mark_paid" });
    }

    // 3. MARQUER UNE TÂCHE COMME TERMINÉE
    if (action === "mark_task_done" && entityId) {
      await supabase
        .from("tasks")
        .update({ status: "done", completed_at: nowIso })
        .eq("id", entityId)
        .eq("user_id", user.id);

      await resolveNotifHelper(supabase, user.id, nowIso, entityId, notificationId);
      return NextResponse.json({ success: true, action: "mark_task_done" });
    }

    // 4. MARQUER UNE SÉANCE DU CALENDRIER COMME TERMINÉE
    if ((action === "mark_event_done" || action === "mark_event_completed") && (entityId || notificationId)) {
      if (entityId) {
        await supabase
          .from("calendar_events")
          .update({ status: "completed" })
          .or(`id.eq.${entityId},activity_id.eq.${entityId}`)
          .eq("user_id", user.id);
      }

      await resolveNotifHelper(supabase, user.id, nowIso, entityId, notificationId);
      return NextResponse.json({ success: true, action: "mark_event_completed" });
    }

    // 5. ANNULER UN ÉVÉNEMENT DU CALENDRIER
    if (action === "mark_event_cancelled" && entityId) {
      await supabase
        .from("calendar_events")
        .update({ status: "cancelled" })
        .eq("id", entityId)
        .eq("user_id", user.id);

      await resolveNotifHelper(supabase, user.id, nowIso, entityId, notificationId);
      return NextResponse.json({ success: true, action: "mark_event_cancelled" });
    }

    // 6. REPORTER (SNOOZE) UNE NOTIFICATION
    if (action === "snooze" && notificationId) {
      const snoozeHours = hours ?? 24;
      const snoozedUntil = new Date(Date.now() + snoozeHours * 60 * 60 * 1000).toISOString();

      await supabase
        .from("notifications")
        .update({
          status: "snoozed",
          snoozed_until: snoozedUntil,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      return NextResponse.json({ success: true, action: "snooze", snoozedUntil });
    }

    // 7. MARQUER COMME LUE
    if (action === "mark_read" && notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "read",
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      return NextResponse.json({ success: true, action: "mark_read" });
    }

    // 8. ÉCARTER (DISMISS) UNE NOTIFICATION
    if (action === "dismiss" && notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          resolved_at: nowIso,
          actioned_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

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

      return NextResponse.json({ success: true, action: "dismiss" });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    console.error("Erreur quick-action notification:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
