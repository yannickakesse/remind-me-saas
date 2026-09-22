import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { Tabs } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/profile-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { SecuritySection } from "@/components/settings/security-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { SessionsSection } from "@/components/settings/sessions-section";
import { SubscriptionSection } from "@/components/settings/subscription-section";
import { DataSection } from "@/components/settings/data-section";
import type { NotificationPreference } from "@/types/database";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const [
    { data: profile },
    { data: userSettings },
    { data: notificationPreferences },
    { data: subscription },
    { data: countries },
    { data: currencies },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, country_code, default_currency, timezone, locale, week_start, time_format")
      .eq("id", user!.id)
      .single(),
    supabase.from("user_settings").select("notif_prefs").eq("user_id", user!.id).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("subscriptions").select("plan, status").eq("user_id", user!.id).maybeSingle(),
    supabase.from("countries").select("code, name").order("name"),
    supabase.from("currencies").select("code, name, symbol").order("name"),
  ]);

  if (!profile) {
    return <p className="text-sm text-danger">Impossible de charger votre profil.</p>;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink-950">Paramètres</h1>
      <p className="mb-8 text-ink-500">Gérez votre profil, votre compte et vos préférences.</p>

      <div data-tour="settings-tabs">
        <Tabs
          items={[
          {
            id: "profile",
            label: "Profil",
            content: (
              <ProfileSection
                userId={user!.id}
                countries={countries ?? []}
                currencies={currencies ?? []}
                profile={profile}
              />
            ),
          },
          { id: "appearance", label: "Apparence", content: <AppearanceSection /> },
          {
            id: "notifications",
            label: "Notifications",
            content: (
              <NotificationsSection
                notifPrefs={userSettings?.notif_prefs ?? null}
                notificationPreferences={notificationPreferences as NotificationPreference | null}
              />
            ),
          },
          { id: "security", label: "Sécurité", content: <SecuritySection /> },
          {
            id: "sessions",
            label: "Sessions",
            content: <SessionsSection email={user!.email ?? ""} lastSignInAt={user!.last_sign_in_at ?? null} />,
          },
          {
            id: "subscription",
            label: "Abonnement",
            content: (
              <SubscriptionSection
                plan={subscription?.plan ?? (user?.user_metadata?.subscription_plan as string) ?? "free"}
                status={subscription?.status ?? "active"}
              />
            ),
          },
          { id: "data", label: "Données", content: <DataSection /> },
        ]}
      />
      </div>
    </div>
  );
}
