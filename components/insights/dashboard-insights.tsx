import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTr } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { getUserInsights } from "@/lib/intelligence/collect";
import { summarizeInsights } from "@/lib/intelligence/rules";
import { InsightCard, InsightsLocked } from "./insight-list";

/** Carte « Analyses » du tableau de bord : les 3 constats les plus importants (Pro / essai). */
export async function DashboardInsights({ userId }: { userId: string }) {
  const tr = await getTr();
  const supabase = createClient();
  const [subscription, insights] = await Promise.all([getUserSubscription(supabase, userId), getUserInsights(supabase, userId)]);
  const relevant = insights.filter((i) => i.level !== "insufficient");
  const counts = summarizeInsights(insights);

  if (!subscription.entitlements.smartInsights) {
    // Sans Pro : aperçu discret, seulement s'il y a réellement quelque chose à signaler
    return counts.total > 0 ? <InsightsLocked counts={counts} /> : null;
  }
  if (relevant.length === 0) return null;
  const toTreat = counts.urgent + counts.attention;

  return (
    <section className="space-y-3 rounded-2xl border border-[#E6E2D9] bg-white p-4 dark:border-[#2A3647] dark:bg-[#1A2332] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#214E3B] dark:text-[#7FD1AE]">{tr("Analyses")}</h2>
          <p className="mt-0.5 text-sm font-semibold text-[#17211D] dark:text-[#F3F1EC]">
            {toTreat > 0 ? tr("{n} point(s) à traiter", { n: toTreat }) : tr("Rien d'urgent à traiter")}
          </p>
        </div>
        <Link
          href="/insights"
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-[#214E3B] hover:bg-[#EEF3EF] dark:text-[#7FD1AE] dark:hover:bg-[#16302A]"
        >
          {tr("Tout voir")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        {relevant.slice(0, 3).map((i) => (
          <InsightCard key={i.id} insight={i} compact />
        ))}
      </div>
    </section>
  );
}
