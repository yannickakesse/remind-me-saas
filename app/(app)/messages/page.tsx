import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { getUserTimezone } from "@/lib/time/timezones";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import {
  getInternalMessages,
  markAllInternalMessagesAsRead,
} from "@/lib/messages/service";
import { buildInboxItems } from "@/lib/messages/inbox-aggregator";
import { MessagesInboxView } from "@/components/messages/messages-inbox-view";

export const metadata: Metadata = {
  title: "Inbox | Remind Me",
  description: "Espace centralisé de vos flux financiers, échéances à traiter et communications officielles.",
};

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const supabase = createClient();
  const timezone = getUserTimezone(profile);

  // Synchronisation proactive des échéances récurrentes pour la période courante
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().slice(0, 10);
  try {
    await ensureIncomeEntries(supabase, user.id, rangeStart, rangeEnd);
  } catch (syncErr) {
    console.warn("[Inbox] ensureIncomeEntries error:", syncErr);
  }

  // Marquage automatique persistant des messages comme lus à l'ouverture
  await markAllInternalMessagesAsRead(supabase, user.id);

  // Récupération simultanée des flux financiers réels et des communications officielles
  const [
    { data: incomeList },
    { data: expenseList },
    { data: scheduledList },
    messagesList,
  ] = await Promise.all([
    supabase
      .from("income")
      .select("id, label, amount, currency, due_date, received, received_at, notes, created_at, activity:activities(id, name, color)")
      .eq("user_id", user.id)
      .order("due_date", { ascending: false })
      .limit(100),
    supabase
      .from("expenses")
      .select("id, label, category, amount, currency, due_date, paid, paid_at, notes, created_at, activity:activities(id, name, color)")
      .eq("user_id", user.id)
      .order("due_date", { ascending: false })
      .limit(100),
    supabase
      .from("scheduled_expenses")
      .select("id, name, category, amount, currency, frequency, next_due_date, status, merchant, notes, created_at, activity:activities(id, name, color)")
      .eq("user_id", user.id)
      .order("next_due_date", { ascending: true })
      .limit(100),
    getInternalMessages(supabase, user.id, 50),
  ]);

  const inboxItems = buildInboxItems({
    incomeList: (incomeList || []) as any,
    expenseList: (expenseList || []) as any,
    scheduledList: (scheduledList || []) as any,
    messagesList: messagesList || [],
    timezone,
  });

  return (
    <div className="relative isolate min-h-full w-full space-y-6 max-w-7xl mx-auto min-w-0">
      {/* Fond d'écran global */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none -z-10"
        style={{ backgroundImage: "url('/images/backgrounds/dashboard-bg.jpg')" }}
      />

      <MessagesInboxView
        initialItems={inboxItems}
        initialMessages={messagesList || []}
        timezone={timezone}
        locale={profile?.locale || "fr"}
      />
    </div>
  );
}
