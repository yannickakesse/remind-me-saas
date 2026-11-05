import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
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

  return (
    <section className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-4 sm:p-6 shadow-xs backdrop-blur-xl space-y-3">
      <div className="relative text-center">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.12em] text-signal">
          <Sparkles className="h-4 w-4" /> {tr("Analyses")}
        </h2>
        <Link href="/insights" className="absolute right-0 top-0 inline-flex items-center gap-1 text-xs font-semibold text-signal hover:underline">
          {tr("Voir")} <ArrowRight className="h-3.5 w-3.5" />
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
