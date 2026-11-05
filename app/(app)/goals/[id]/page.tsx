import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { computeGoalProgress, type GoalRow, type StepRow } from "@/lib/goals/progress";
import { GoalDetail, type ProgressEntry } from "@/components/goals/goal-detail";

export const dynamic = "force-dynamic";

export default async function GoalPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();
  const supabase = createClient();
  const db = supabase as any;

  const [{ data: profile }, { data: goal }, { data: steps }, { data: entries }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    db.from("goals").select("*").eq("id", params.id).eq("user_id", user.id).maybeSingle(),
    db.from("goal_steps").select("*").eq("goal_id", params.id).eq("user_id", user.id).order("position"),
    db
      .from("goal_progress_entries")
      .select("id, kind, value_delta, value_after, note, recorded_at, step_id")
      .eq("goal_id", params.id)
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(30),
  ]);
  if (!goal) notFound();

  const today = DateTime.now().setZone(profile?.timezone || "UTC").toISODate()!;
  const stepRows = (steps ?? []) as StepRow[];
  const progress = computeGoalProgress(goal as GoalRow, stepRows, today);

  return (
    <GoalDetail
      goal={goal as GoalRow}
      steps={stepRows}
      progress={progress}
      entries={(entries ?? []) as ProgressEntry[]}
      today={today}
    />
  );
}
