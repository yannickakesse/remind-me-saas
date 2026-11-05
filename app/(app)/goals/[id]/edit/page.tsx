import { notFound } from "next/navigation";
import { getTr } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { PageBackground } from "@/components/shared/page-background";
import { GoalForm } from "@/components/goals/goal-form";
import { updateGoal } from "../../actions";
import type { GoalInput } from "@/lib/validation/goals";
import type { GoalRow } from "@/lib/goals/progress";

export default async function EditGoalPage({ params }: { params: { id: string } }) {
  const tr = await getTr();
  const user = await requireCurrentUser();
  const supabase = createClient();
  const { data } = await (supabase as any).from("goals").select("*").eq("id", params.id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  const goal = data as GoalRow;

  async function save(input: GoalInput) {
    "use server";
    const res = await updateGoal(params.id, input);
    return res.ok ? { ok: true as const, data: { id: params.id } } : res;
  }

  const num = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

  return (
    <div className="relative isolate min-h-full w-full space-y-6">
      <PageBackground src="/images/backgrounds/tasks-upcoming-bg.jpg" />
      <div className="mx-auto max-w-2xl rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-5 sm:p-6 text-center shadow-xs backdrop-blur-xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">{tr("Modifier l'objectif")}</h1>
      </div>
      <GoalForm
        action={save}
        submitLabel={tr("Enregistrer")}
        initial={{
          title: goal.title,
          description: goal.description ?? "",
          domain: goal.domain,
          motivation: goal.motivation ?? "",
          startDate: goal.start_date,
          dueDate: goal.due_date ?? "",
          kind: goal.kind,
          expectedResult: goal.expected_result ?? "",
          unit: goal.unit ?? "",
          startValue: num(goal.start_value),
          targetValue: num(goal.target_value),
          reminderFrequency: (goal.reminder_frequency as "" | "daily" | "weekly" | "monthly") ?? "",
          reminderTime: goal.reminder_time ? String(goal.reminder_time).slice(0, 5) : "",
          reminderWeekday: goal.reminder_weekday === null || goal.reminder_weekday === undefined ? "1" : String(goal.reminder_weekday),
        }}
      />
    </div>
  );
}
