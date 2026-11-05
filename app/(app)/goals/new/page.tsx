import { DateTime } from "luxon";
import { getTr } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { PageBackground } from "@/components/shared/page-background";
import { GoalForm } from "@/components/goals/goal-form";
import { createGoal } from "../actions";

export default async function NewGoalPage() {
  const tr = await getTr();
  const user = await requireCurrentUser();
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const today = DateTime.now().setZone(profile?.timezone || "UTC").toISODate()!;

  return (
    <div className="relative isolate min-h-full w-full space-y-6">
      <PageBackground src="/images/backgrounds/tasks-upcoming-bg.jpg" />
      <div className="mx-auto max-w-2xl rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-5 sm:p-6 text-center shadow-xs backdrop-blur-xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">{tr("Nouvel objectif")}</h1>
        <p className="mt-1 text-xs sm:text-sm text-ink-600 dark:text-ink-400">{tr("Définissez ce que vous voulez accomplir, à votre façon.")}</p>
      </div>
      <GoalForm
        withSteps
        action={createGoal}
        submitLabel={tr("Créer l'objectif")}
        initial={{
          title: "", description: "", domain: "personal", motivation: "", startDate: today, dueDate: "",
          kind: "qualitative", expectedResult: "", unit: "", startValue: "", targetValue: "",
          reminderFrequency: "", reminderTime: "", reminderWeekday: "1",
        }}
      />
    </div>
  );
}
