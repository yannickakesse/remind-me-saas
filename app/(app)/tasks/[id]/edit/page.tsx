import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/shared/task-form";
import { updateTask } from "../../actions";

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: task }, { data: activities }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", params.id).eq("user_id", user!.id).single(),
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  if (!task) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-950">Modifier la tâche</h1>
      </div>
      <TaskForm
        activities={activities ?? []}
        action={updateTask.bind(null, task.id)}
        submitLabel="Enregistrer"
        initial={{
          title: task.title,
          description: task.description ?? "",
          activityId: task.activity_id ?? "",
          priority: task.priority,
          dueDate: task.due_date ?? "",
          dueTime: task.due_time ?? "",
          reminderMinutesBefore:
            task.reminder_minutes_before !== null ? String(task.reminder_minutes_before) : "",
        }}
      />
    </div>
  );
}
