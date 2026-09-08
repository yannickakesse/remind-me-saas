"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { taskPriorityLabel, type TASK_PRIORITIES } from "@/lib/validation/tasks";
import type { TaskStatus, TaskPriority } from "@/types/database";
import { toggleTaskStatus, cycleTaskStatus, deleteTask } from "@/app/(app)/tasks/actions";

export interface TaskItemData {
  id: string;
  title: string;
  description: string | null;
  activity_id: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  reminder_minutes_before: number | null;
  completed_at: string | null;
  activity?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface TaskCardProps {
  task: TaskItemData;
}

const PRIORITY_BADGE_CONFIG: Record<TaskPriority, { tone: BadgeTone; label: string }> = {
  urgent: { tone: "danger", label: "Urgente" },
  high: { tone: "warning", label: "Haute" },
  medium: { tone: "signal", label: "Moyenne" },
  low: { tone: "neutral", label: "Basse" },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; badgeTone: BadgeTone }> = {
  todo: { label: "À faire", badgeTone: "neutral" },
  in_progress: { label: "En cours", badgeTone: "info" },
  done: { label: "Terminée", badgeTone: "positive" },
  cancelled: { label: "Annulée", badgeTone: "neutral" },
};

export function TaskCard({ task }: TaskCardProps) {
  const [isPending, startTransition] = useTransition();

  const isDone = task.status === "done";
  const isCancelled = task.status === "cancelled";
  const isInProgress = task.status === "in_progress";

  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue =
    Boolean(task.due_date && task.due_date < todayStr && !isDone && !isCancelled);
  const isToday = Boolean(task.due_date && task.due_date === todayStr);

  function handleToggleCheck() {
    startTransition(async () => {
      await toggleTaskStatus(task.id, task.status);
    });
  }

  function handleCycleStatus() {
    startTransition(async () => {
      await cycleTaskStatus(task.id, task.status);
    });
  }

  function handleDelete() {
    if (confirm("Supprimer définitivement cette tâche ?")) {
      startTransition(async () => {
        await deleteTask(task.id);
      });
    }
  }

  // Formatage de la date d'échéance
  let dueDisplay = null;
  if (task.due_date) {
    if (isOverdue) {
      dueDisplay = (
        <span className="inline-flex items-center gap-1 font-medium text-danger">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
          En retard : {task.due_date}
          {task.due_time ? ` à ${task.due_time.slice(0, 5)}` : ""}
        </span>
      );
    } else if (isToday) {
      dueDisplay = (
        <span className="inline-flex items-center gap-1 font-medium text-warning">
          Aujourd'hui
          {task.due_time ? ` à ${task.due_time.slice(0, 5)}` : ""}
        </span>
      );
    } else {
      dueDisplay = (
        <span className="text-ink-500">
          Échéance : {task.due_date}
          {task.due_time ? ` à ${task.due_time.slice(0, 5)}` : ""}
        </span>
      );
    }
  }

  return (
    <div
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-canvas-raised p-4 transition-all duration-150 hover:shadow-sm ${
        isDone
          ? "border-ink-200 bg-canvas/60 opacity-65"
          : isOverdue
          ? "border-danger/30 bg-danger/[0.02]"
          : "border-ink-200 hover:border-ink-300"
      } ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        {/* Checkbox interactive */}
        <button
          type="button"
          onClick={handleToggleCheck}
          aria-label={isDone ? "Marquer comme non terminée" : "Marquer comme terminée"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            isDone
              ? "border-positive bg-positive text-white"
              : isInProgress
              ? "border-signal bg-signal-soft text-signal"
              : "border-ink-300 hover:border-signal bg-canvas-raised"
          }`}
        >
          {isDone ? (
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : isInProgress ? (
            <span className="h-2 w-2 rounded-full bg-signal" />
          ) : null}
        </button>

        {/* Détails texte & métadonnées */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-medium text-ink-950 text-base leading-snug ${
                isDone ? "line-through text-ink-500" : ""
              }`}
            >
              {task.title}
            </span>

            {/* Pastille Priorité */}
            <Badge tone={PRIORITY_BADGE_CONFIG[task.priority]?.tone ?? "neutral"}>
              {PRIORITY_BADGE_CONFIG[task.priority]?.label ?? task.priority}
            </Badge>

            {/* Badge Statut si En cours ou Annulée */}
            {isInProgress ? (
              <Badge tone="info">En cours</Badge>
            ) : isCancelled ? (
              <Badge tone="neutral">Annulée</Badge>
            ) : null}
          </div>

          {task.description ? (
            <p className="mt-1 text-sm text-ink-600 line-clamp-2">{task.description}</p>
          ) : null}

          {/* Métadonnées : Activité & Échéance */}
          <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-ink-500">
            {task.activity ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-ink-700">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: task.activity.color ?? "#1E3A5F" }}
                />
                {task.activity.name}
              </span>
            ) : (
              <span className="text-ink-400">Tâche libre</span>
            )}

            {dueDisplay ? (
              <>
                <span className="text-ink-300">•</span>
                {dueDisplay}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex items-center gap-2 sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-ink-100">
        {!isDone && !isCancelled ? (
          <button
            type="button"
            onClick={handleCycleStatus}
            className="rounded-md border border-ink-200 bg-canvas-raised px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50 transition-colors"
            title="Basculer statut (À faire / En cours)"
          >
            {isInProgress ? "Passer à faire" : "Démarrer"}
          </button>
        ) : null}

        <Link
          href={`/tasks/${task.id}/edit`}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-signal hover:bg-signal-soft transition-colors"
        >
          Modifier
        </Link>

        <button
          type="button"
          onClick={handleDelete}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-400 hover:text-danger hover:bg-danger-soft/50 transition-colors"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
