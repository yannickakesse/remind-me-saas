import { getTr } from "@/lib/i18n/server";
import { PageBackground } from "@/components/shared/page-background";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { Tabs } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/profile-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { SecuritySection } from "@/components/settings/security-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { SessionsSection } from "@/components/settings/sessions-section";
import { SubscriptionSection } from "@/components/settings/subscription-section";
import { getUserSubscription, getFirstMonthOfferEligible } from "@/lib/subscriptions/server";
import { DataSection } from "@/components/settings/data-section";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";
import type { NotificationPreference } from "@/types/database";

export default async function SettingsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const tr = await getTr();
  const user = await requireCurrentUser();
  const supabase = createClient();

  const [
    { data: profile },
    { data: userSettings },
    { data: notificationPreferences },
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
    supabase.from("countries").select("code, name").order("name"),
    supabase.from("currencies").select("code, name, symbol").order("name"),
  ]);

  // Forfait payé + essai éventuel, calculés par le serveur (source unique)
  const [subscription, firstMonthOffer] = await Promise.all([
    getUserSubscription(supabase, user!.id),
    getFirstMonthOfferEligible(supabase, user!.id),
  ]);

  if (!profile) {
    return <p className="text-sm text-danger">{tr("Impossible de charger votre profil.")}</p>;
  }

  return (
    <div className="relative isolate min-h-full w-full space-y-6">
      <PageBackground src="/images/backgrounds/settings-bg.jpg" />

      <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md p-6 sm:p-8 shadow-xs" data-tour="settings-header">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 dark:text-white">{tr("Paramètres")}</h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-500">{tr("Gérez votre profil, votre compte et vos préférences.")}</p>
          </div>
          <div className="shrink-0">
            <SectionGuideTrigger section="settings" label={tr("Guide paramètres")} />
          </div>
        </div>
      </div>

      <div data-tour="settings-tabs">
        <Tabs
          defaultTabId={searchParams?.tab}
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
                userFullName={profile?.full_name ?? null}
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
                plan={subscription.paidPlan}
                demoEnabled={process.env.ENABLE_PLAN_DEMO === "true"}
                status={subscription.status}
                firstMonthOffer={firstMonthOffer}
                trial={subscription.isTrial && subscription.trialEndsAt ? { daysLeft: subscription.trialDaysLeft, endsAt: subscription.trialEndsAt } : null}
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
