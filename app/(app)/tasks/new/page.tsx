import { getTr } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/shared/task-form";
import { createTask } from "../actions";
import { requireCurrentUser } from "@/lib/supabase/auth";

export default async function NewTaskPage() {
  const tr = await getTr();
  const user = await requireCurrentUser();
  const supabase = createClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("id, name, color")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("name", { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-950">{tr("Nouvelle tâche")}</h1>
        <p className="text-ink-500">{tr("Libre ou liée à l'une de vos activités.")}</p>
      </div>
      <TaskForm activities={activities ?? []} action={createTask} />
    </div>
  );
}
