import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, notificationId, entityId } = body;
    const nowIso = new Date().toISOString();

    if (action === "mark_received" && entityId) {
      // 1. Mettre à jour le revenu
      await supabase
        .from("income")
        .update({ received: true, received_date: nowIso.split("T")[0] })
        .eq("id", entityId)
        .eq("user_id", user.id);

      // 2. Résoudre la notification correspondante ainsi que toutes les notifications associées à ce revenu
      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("user_id", user.id)
        .or(`id.eq.${notificationId},entity_id.eq.${entityId}`);

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
          .update({ paid: true, paid_date: nowIso.split("T")[0] })
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
        .or(`id.eq.${notificationId},entity_id.eq.${entityId}`);

      return NextResponse.json({ success: true, action: "mark_paid" });
    }

    if (action === "snooze" && notificationId) {
      const hours = body.hours ?? 24;
      const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

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
