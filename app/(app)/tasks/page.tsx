import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import {
  TASK_PRIORITY_STYLES,
  taskPriorityLabel,
  taskStatusLabel,
} from "@/lib/validation/tasks";
import { setTaskStatus, deleteTask } from "./actions";

export default async function TasksPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user!.id).single();
  const timezone = profile?.timezone ?? "UTC";
  const todayISO = DateTime.now().setZone(timezone).toISODate()!;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, due_time, activities(name, color)")
    .eq("user_id", user!.id)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const all = tasks ?? [];

  const overdue = all.filter(
    (t) => t.status !== "done" && t.status !== "cancelled" && t.due_date !== null && t.due_date < todayISO
  );
  const active = all.filter(
    (t) => t.status !== "done" && t.status !== "cancelled" && !(t.due_date !== null && t.due_date < todayISO)
  );
  const finished = all.filter((t) => t.status === "done" || t.status === "cancelled");

  const hasTasks = all.length > 0;

  function renderTask(task: (typeof all)[number]) {
    const activity = Array.isArray(task.activities) ? task.activities[0] : task.activities;
    const isDone = task.status === "done";
    const isCancelled = task.status === "cancelled";

    const dueLabel = task.due_date
      ? DateTime.fromISO(task.due_date, { zone: timezone }).setLocale("fr").toFormat("d MMM") +
        (task.due_time ? ` à ${task.due_time.slice(0, 5)}` : "")
      : null;

    return (
      <li key={task.id} className="flex items-start gap-3 rounded-lg border border-ink-100 bg-canvas-raised px-4 py-3">
        <form action={setTaskStatus.bind(null, task.id, isDone ? "todo" : "done")}>
          <button
            type="submit"
            aria-label={isDone ? "Rouvrir la tâche" : "Marquer comme terminée"}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
              isDone ? "border-positive bg-positive text-white" : "border-ink-300 text-transparent hover:border-signal"
            }`}
          >
            ✓
          </button>
        </form>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-medium text-ink-950 ${isDone || isCancelled ? "text-ink-500 line-through" : ""}`}>
              {task.title}
            </p>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TASK_PRIORITY_STYLES[task.priority]}`}>
              {taskPriorityLabel(task.priority)}
            </span>
            {isCancelled ? (
              <span className="rounded-full border border-ink-300 px-2 py-0.5 text-xs font-medium text-ink-500">
                {taskStatusLabel(task.status)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-ink-500">
            {activity ? (
              <span className="mr-2 inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activity.color ?? "#1E3A5F" }} />
                {activity.name}
              </span>
            ) : null}
            {dueLabel ? <span>Échéance : {dueLabel}</span> : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link href={`/tasks/${task.id}/edit`} className="text-sm font-medium text-signal hover:underline">
            Modifier
          </Link>
          {!isCancelled && !isDone ? (
            <form action={setTaskStatus.bind(null, task.id, "cancelled")}>
              <button type="submit" className="text-sm text-ink-500 hover:text-warning hover:underline">
                Annuler
              </button>
            </form>
          ) : null}
          <form action={deleteTask.bind(null, task.id)}>
            <button type="submit" className="text-sm text-ink-500 hover:text-danger hover:underline">
              Supprimer
            </button>
          </form>
        </div>
      </li>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Tâches</h1>
          <p className="text-ink-500">Libres ou liées à vos activités.</p>
        </div>
        <Link
          href="/tasks/new"
          className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90"
        >
          + Ajouter une tâche
        </Link>
      </div>

      {!hasTasks ? (
        <div className="rounded-lg border border-dashed border-ink-300 px-6 py-12 text-center">
          <p className="mb-1 font-medium text-ink-950">Vous n&apos;avez pas encore de tâche</p>
          <p className="mb-4 text-sm text-ink-500">
            Créez des tâches libres ou liées à une activité pour ne rien oublier.
          </p>
          <Link
            href="/tasks/new"
            className="inline-block rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90"
          >
            + Ajouter une tâche
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {overdue.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-danger">
                En retard ({overdue.length})
              </h2>
              <ul className="flex flex-col gap-2">{overdue.map(renderTask)}</ul>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              À faire ({active.length})
            </h2>
            {active.length === 0 ? (
              <p className="text-sm text-ink-500">Rien d&apos;autre en attente.</p>
            ) : (
              <ul className="flex flex-col gap-2">{active.map(renderTask)}</ul>
            )}
          </section>

          {finished.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
                Terminées / annulées ({finished.length})
              </h2>
              <ul className="flex flex-col gap-2 opacity-70">{finished.slice(0, 20).map(renderTask)}</ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
