import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/shared/task-form";
import { updateTask } from "../../actions";
import { requireCurrentUser } from "@/lib/supabase/auth";

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const [{ data: task }, { data: activities }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", params.id).eq("user_id", user.id).single(),
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  if (!task) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950">Modifier la tâche</h1>
        <p className="text-sm text-ink-500">Mettez à jour les informations ou le statut de votre tâche.</p>
      </div>
      <TaskForm
        activities={activities ?? []}
        action={updateTask.bind(null, task.id)}
        submitLabel="Enregistrer les modifications"
        initial={{
          title: task.title,
          description: task.description ?? "",
          activityId: task.activity_id ?? "",
          priority: task.priority,
          status: task.status,
          dueDate: task.due_date ?? "",
          dueTime: task.due_time ?? "",
          reminderMinutesBefore:
            task.reminder_minutes_before !== null ? String(task.reminder_minutes_before) : "",
        }}
      />
    </div>
  );
}
