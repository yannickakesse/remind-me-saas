import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const quickActionSchema = z.object({
  action: z.enum(["mark_received", "mark_paid", "mark_task_done", "snooze", "mark_read", "dismiss"]),
  notificationId: z.string().optional(),
  entityId: z.string().optional(),
  hours: z.number().positive().max(720).optional(),
});

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
    const todayDate = nowIso.split("T")[0];

    if (action === "mark_received" && entityId) {
      // 1. Mettre à jour le revenu (received = true, received_at automatique par trigger)
      await supabase
        .from("income")
        .update({ received: true, received_at: todayDate })
        .eq("id", entityId)
        .eq("user_id", user.id);

      // 2. Résoudre toutes les notifications associées à ce revenu
      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("user_id", user.id)
        .eq("entity_id", entityId);

      if (notificationId) {
        await supabase
          .from("notifications")
          .update({
            status: "resolved",
            resolved_at: nowIso,
            read_at: nowIso,
          })
          .eq("id", notificationId)
          .eq("user_id", user.id);
      }

      return NextResponse.json({ success: true, action: "mark_received" });
    }

    if (action === "mark_paid" && entityId) {
      // Vérifier s'il s'agit d'une dépense ponctuelle
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
        // Sinon dépense programmée
        await supabase
          .from("scheduled_expenses")
          .update({ status: "paid" })
          .eq("id", entityId)
          .eq("user_id", user.id);
      }

      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("user_id", user.id)
        .eq("entity_id", entityId);

      if (notificationId) {
        await supabase
          .from("notifications")
          .update({
            status: "resolved",
            resolved_at: nowIso,
            read_at: nowIso,
          })
          .eq("id", notificationId)
          .eq("user_id", user.id);
      }

      return NextResponse.json({ success: true, action: "mark_paid" });
    }

    if (action === "mark_task_done" && entityId) {
      // 1. Marquer la tâche comme terminée
      await supabase
        .from("tasks")
        .update({ status: "done", completed_at: nowIso })
        .eq("id", entityId)
        .eq("user_id", user.id);

      // 2. Auto-Stop des alertes
      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("user_id", user.id)
        .eq("entity_id", entityId);

      if (notificationId) {
        await supabase
          .from("notifications")
          .update({
            status: "resolved",
            resolved_at: nowIso,
            read_at: nowIso,
          })
          .eq("id", notificationId)
          .eq("user_id", user.id);
      }

      return NextResponse.json({ success: true, action: "mark_task_done" });
    }

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

    if (action === "dismiss" && notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      return NextResponse.json({ success: true, action: "dismiss" });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    console.error("Erreur quick-action notification:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
