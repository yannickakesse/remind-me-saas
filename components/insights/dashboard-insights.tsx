import { createClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { getUserInsightsWithOverview } from "@/lib/intelligence/collect";
import { summarizeInsights } from "@/lib/intelligence/rules";
import { InsightsLocked } from "./insight-list";
import { DashboardInsightsCard } from "./dashboard-insights-card";

/** Carte « Analyses » du tableau de bord : anneau des points, charge des 7 jours, 3 points prioritaires (Pro / essai). */
export async function DashboardInsights({ userId }: { userId: string }) {
  const supabase = createClient();
  const [subscription, data] = await Promise.all([getUserSubscription(supabase, userId), getUserInsightsWithOverview(supabase, userId)]);
  const counts = summarizeInsights(data.insights);

  if (!subscription.entitlements.smartInsights) {
    // Sans Pro : aperçu discret, seulement s'il y a réellement quelque chose à signaler
    return counts.total > 0 ? <InsightsLocked counts={counts} /> : null;
  }
  // Rien à signaler et aucune activité dans la semaine : pas de bloc vide
  if (counts.total === 0 && data.overview.days.every((d) => d.occupiedMinutes === 0)) return null;

  return <DashboardInsightsCard insights={data.insights} overview={data.overview} counts={counts} />;
}
