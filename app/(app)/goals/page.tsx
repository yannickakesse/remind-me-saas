import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { computeGoalProgress, type GoalRow, type StepRow } from "@/lib/goals/progress";
import { GoalsView, type GoalListItem } from "@/components/goals/goals-view";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await requireCurrentUser();
  const supabase = createClient();
  const db = supabase as any; // tables 0027 absentes des types générés

  const [{ data: profile }, goalsRes, stepsRes, subscription] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    db.from("goals").select("*").eq("user_id", user.id).order("position").order("created_at", { ascending: false }),
    db.from("goal_steps").select("*").eq("user_id", user.id),
    getUserSubscription(supabase, user.id),
  ]);

  // Migration 0027 pas encore appliquée : page explicative plutôt qu'une erreur
  const moduleReady = !goalsRes.error;
  const today = DateTime.now().setZone(profile?.timezone || "UTC").toISODate()!;
  const steps = (stepsRes.data ?? []) as StepRow[];

  const items: GoalListItem[] = ((goalsRes.data ?? []) as GoalRow[]).map((goal) => ({
    goal,
    progress: computeGoalProgress(goal, steps.filter((s) => s.goal_id === goal.id), today),
  }));

  const activeCount = items.filter((i) => i.goal.status === "active" || i.goal.status === "paused").length;

  return (
    <GoalsView
      items={items}
      moduleReady={moduleReady}
      quota={{ used: activeCount, max: Number.isFinite(subscription.entitlements.maxPersonalGoals) ? subscription.entitlements.maxPersonalGoals : null }}
    />
  );
}
