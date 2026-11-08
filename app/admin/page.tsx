import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { founderEmails, isFounder, loadFounderMetrics } from "@/lib/admin/founder-metrics";
import { FounderDashboard } from "@/components/admin/founder-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tableau de bord fondateur", robots: { index: false, follow: false } };

/**
 * Tableau de bord du fondateur : réservé aux adresses de FOUNDER_EMAILS.
 * Les chiffres sont lus côté serveur avec la clé de service ; rien n'est exposé aux autres comptes.
 */
export default async function FounderAdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=%2Fadmin");

  if (!isFounder(user.email)) {
    const notConfigured = founderEmails().length === 0;
    return (
      <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-ink-200 dark:border-ink-800 bg-canvas-raised p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-ink-950 dark:text-white">Accès réservé au fondateur</h1>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
            {notConfigured
              ? "Le tableau de bord n'est pas encore activé : ajoutez la variable FOUNDER_EMAILS (votre adresse de connexion) dans Vercel, puis redéployez."
              : "Cette page n'est pas disponible pour ce compte."}
          </p>
          <a href="/dashboard" className="mt-6 inline-flex rounded-full bg-ink-950 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-ink-950">
            Retour à l'application
          </a>
        </div>
      </main>
    );
  }

  let metrics;
  let loadError: string | null = null;
  try {
    metrics = await loadFounderMetrics(createAdminClient());
  } catch (e: any) {
    loadError = e?.message || "Lecture impossible.";
  }

  const channels = {
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    email: Boolean(process.env.RESEND_API_KEY),
    discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
    serviceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  return <FounderDashboard metrics={metrics ?? null} loadError={loadError} channels={channels} founderEmail={user.email ?? ""} />;
}
