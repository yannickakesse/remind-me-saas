import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getInternalMessages,
  getUnreadMessagesCount,
  markAllInternalMessagesAsRead,
  markInternalMessageAsRead,
} from "@/lib/messages/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const autoMarkRead = searchParams.get("autoMarkRead") === "true";

    // Si autoMarkRead est demandé (ex: ouverture de la messagerie), marquer tous les non-lus en base
    if (autoMarkRead) {
      await markAllInternalMessagesAsRead(supabase, user.id);
    }

    const [messages, unreadCount] = await Promise.all([
      getInternalMessages(supabase, user.id),
      getUnreadMessagesCount(supabase, user.id),
    ]);

    return NextResponse.json({
      success: true,
      messages,
      unreadCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Erreur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, messageId } = body;

    // Marquage individuel d'un message comme lu
    if (action === "mark_read" && messageId) {
      const ok = await markInternalMessageAsRead(supabase, user.id, messageId);
      const unreadCount = await getUnreadMessagesCount(supabase, user.id);
      return NextResponse.json({ success: ok, unreadCount });
    }

    // Marquage global de tous les messages comme lus
    if (action === "mark_all_read") {
      const updatedCount = await markAllInternalMessagesAsRead(supabase, user.id);
      return NextResponse.json({ success: true, updatedCount, unreadCount: 0 });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Erreur" }, { status: 500 });
  }
}
