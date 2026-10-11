import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInternalMessages, getUnreadMessagesCount } from "@/lib/messages/service";

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

    if (action === "mark_read" && messageId) {
      await (supabase as any)
        .from("internal_messages")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("user_id", user.id);

      return NextResponse.json({ success: true });
    }

    if (action === "mark_all_read") {
      await (supabase as any)
        .from("internal_messages")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Erreur" }, { status: 500 });
  }
}
