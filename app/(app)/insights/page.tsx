import { getTr } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { getUserInsights } from "@/lib/intelligence/collect";
import { summarizeInsights } from "@/lib/intelligence/rules";
import { PageBackground } from "@/components/shared/page-background";
import { InsightCard, InsightsLocked } from "@/components/insights/insight-list";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const tr = await getTr();
  const user = await requireCurrentUser();
  const supabase = createClient();
  const [subscription, insights] = await Promise.all([getUserSubscription(supabase, user.id), getUserInsights(supabase, user.id)]);
  const counts = summarizeInsights(insights);
  // Droit vérifié côté serveur : sans Pro (ou essai), le détail n'est jamais envoyé au navigateur
  const allowed = subscription.entitlements.smartInsights;

  return (
    <div className="relative isolate min-h-full w-full space-y-6">
      <PageBackground src="/images/backgrounds/reports-bg.jpg" />

      <section className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-5 sm:p-7 text-center shadow-xs backdrop-blur-xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">{tr("Analyses")}</h1>
        <p className="mx-auto mt-1 max-w-lg text-xs sm:text-sm text-ink-600 dark:text-ink-400">
          {tr("Remind Me examine vos budgets, revenus, dépenses, journées et objectifs, et vous signale ce qui mérite votre attention. Uniquement à partir de vos données, sans rien inventer.")}
        </p>
        {allowed && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-danger/10 px-3 py-1 text-danger">{tr("{n} urgent(s)", { n: counts.urgent })}</span>
            <span className="rounded-full bg-warning/15 px-3 py-1 text-amber-700 dark:text-amber-300">{tr("{n} à surveiller", { n: counts.attention })}</span>
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-700 dark:text-sky-300">{tr("{n} bon(s) à savoir", { n: counts.info })}</span>
          </div>
        )}
      </section>

      {!allowed ? (
        <InsightsLocked counts={counts} />
      ) : insights.length === 0 ? (
        <div className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-8 text-center">
          <p className="text-base font-bold text-ink-950 dark:text-white">{tr("Tout est sous contrôle")}</p>
          <p className="mt-1 text-xs text-ink-600 dark:text-ink-400">{tr("Aucun point d'attention pour le moment. Les analyses se mettent à jour à chaque visite.")}</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-3xl gap-3">
          {insights.map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}
        </div>
      )}
    </div>
  );
}
