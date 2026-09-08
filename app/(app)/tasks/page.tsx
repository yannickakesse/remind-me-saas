import { createClient } from "@/lib/supabase/server";
import { TasksView } from "@/components/tasks/tasks-view";

export default async function TasksPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tasks }, { data: activities }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, activity:activities(id, name, color)")
      .eq("user_id", user!.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  return <TasksView tasks={tasks ?? []} activities={activities ?? []} />;
}
