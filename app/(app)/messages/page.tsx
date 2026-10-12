import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { getUserTimezone } from "@/lib/time/timezones";
import {
  getInternalMessages,
  markAllInternalMessagesAsRead,
} from "@/lib/messages/service";
import { MessagesInboxView } from "@/components/messages/messages-inbox-view";

export const metadata: Metadata = {
  title: "Messagerie | Remind Me",
  description: "Boîte de réception officielle de vos alertes financières et bilans.",
};

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const supabase = createClient();
  const timezone = getUserTimezone(profile);

  // Marquage automatique persistant de TOUS les messages non lus dès l'ouverture de la page principale
  // Enregistré directement dans la base de données Supabase sous RLS hermétique (user_id = user.id)
  await markAllInternalMessagesAsRead(supabase, user.id);

  // Récupération des messages classés par ordre chronologique strict (du plus récent au plus ancien)
  const messages = await getInternalMessages(supabase, user.id);

  return (
    <div className="relative isolate min-h-full w-full space-y-6 max-w-7xl mx-auto min-w-0">
      {/* Fond d'écran global */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none -z-10"
        style={{ backgroundImage: "url('/images/backgrounds/dashboard-bg.jpg')" }}
      />

      <MessagesInboxView
        initialMessages={messages}
        timezone={timezone}
        locale={profile?.locale || "fr"}
      />
    </div>
  );
}
