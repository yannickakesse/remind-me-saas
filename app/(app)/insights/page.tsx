import { getTr } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { getUserInsightsWithOverview } from "@/lib/intelligence/collect";
import { summarizeInsights } from "@/lib/intelligence/rules";
import { PageBackground } from "@/components/shared/page-background";
import { InsightsLocked } from "@/components/insights/insight-list";
import { InsightsView } from "@/components/insights/insights-view";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const tr = await getTr();
  const user = await requireCurrentUser();
  const supabase = createClient();
  const [subscription, data] = await Promise.all([getUserSubscription(supabase, user.id), getUserInsightsWithOverview(supabase, user.id)]);
  const counts = summarizeInsights(data.insights);
  // Droit vérifié côté serveur : sans Pro (ou essai), le détail n'est jamais envoyé au navigateur
  const allowed = subscription.entitlements.smartInsights;

  return (
    <div className="relative isolate min-h-full w-full">
      <PageBackground src="/images/backgrounds/reports-bg.jpg" />
      {allowed ? (
        <InsightsView insights={data.insights} overview={data.overview} counts={counts} />
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          <header className="rounded-2xl border border-[#E6E2D9] bg-white p-5 text-center dark:border-[#2A3647] dark:bg-[#1A2332]">
            <h1 className="text-2xl font-bold tracking-tight text-[#17211D] dark:text-[#F3F1EC]">{tr("Analyses")}</h1>
            <p className="mx-auto mt-1 max-w-lg text-[13px] text-[#4A524D] dark:text-[#B7C0CC]">
              {tr("Remind Me examine vos budgets, revenus, dépenses, journées et objectifs, et vous signale ce qui mérite votre attention. Uniquement à partir de vos données, sans rien inventer.")}
            </p>
          </header>
          <InsightsLocked counts={counts} />
        </div>
      )}
    </div>
  );
}
