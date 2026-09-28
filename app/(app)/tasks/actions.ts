"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { taskFormSchema } from "@/lib/validation/tasks";
import {
  resolveEntityNotifications,
  invalidateOutdatedEntityReminders,
  triggerProactiveReminders,
} from "@/lib/notifications/engine";
import type { TaskStatus } from "@/types/database";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function parseFormData(formData: FormData) {
  return taskFormSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    activityId: formData.get("activityId") || "",
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || "",
    dueTime: formData.get("dueTime") || "",
    reminderMinutesBefore: formData.get("reminderMinutesBefore") || "",
  });
}

export async function createTask(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseFormData(formData);
  const statusValue = formData.get("status") as TaskStatus | null;
  const initialStatus: TaskStatus = statusValue === "in_progress" ? "in_progress" : "todo";

  const { data: createdTask, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      activity_id: parsed.activityId || null,
      title: parsed.title,
      description: parsed.description || null,
      priority: parsed.priority,
      due_date: parsed.dueDate || null,
      due_time: parsed.dueTime || null,
      reminder_minutes_before:
        parsed.reminderMinutesBefore === "" || parsed.reminderMinutesBefore === undefined
          ? null
          : parsed.reminderMinutesBefore,
      status: initialStatus,
    })
    .select("id")
    .single();

  if (error) throw new Error("Impossible de créer la tâche. Vérifiez les champs.");

  // Évaluation immédiate des rappels
  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  redirect("/tasks");
}

export async function postponeTask(taskId: string, newDueDate: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("tasks")
    .update({
      due_date: newDueDate,
      status: "todo",
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de reporter la tâche.");

  // Invalider les anciens rappels et recalculer les rappels pour la nouvelle date
  await invalidateOutdatedEntityReminders(supabase, taskId, user.id);
  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function updateTask(taskId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseFormData(formData);
  const statusValue = formData.get("status") as TaskStatus | null;

  const updatePayload: Record<string, unknown> = {
    activity_id: parsed.activityId || null,
    title: parsed.title,
    description: parsed.description || null,
    priority: parsed.priority,
    due_date: parsed.dueDate || null,
    due_time: parsed.dueTime || null,
    reminder_minutes_before:
      parsed.reminderMinutesBefore === "" || parsed.reminderMinutesBefore === undefined
        ? null
        : parsed.reminderMinutesBefore,
  };

  if (statusValue && ["todo", "in_progress", "done", "cancelled"].includes(statusValue)) {
    updatePayload.status = statusValue;
  }

  const { error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de modifier la tâche.");

  // Auto-Stop si terminée/annulée ou recalibrage si modifiée
  if (statusValue === "done" || statusValue === "cancelled") {
    await resolveEntityNotifications(supabase, taskId, user.id);
  } else {
    await invalidateOutdatedEntityReminders(supabase, taskId, user.id);
    await triggerProactiveReminders(supabase, user.id);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  redirect("/tasks");
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de mettre à jour le statut de la tâche.");

  // Auto-Stop & Résolution immédiate des alertes si terminée ou annulée
  if (status === "done" || status === "cancelled") {
    await resolveEntityNotifications(supabase, taskId, user.id);
  } else {
    await triggerProactiveReminders(supabase, user.id);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function toggleTaskStatus(taskId: string, currentStatus: TaskStatus) {
  const newStatus: TaskStatus = currentStatus === "done" ? "todo" : "done";
  return setTaskStatus(taskId, newStatus);
}

export async function cycleTaskStatus(taskId: string, currentStatus: TaskStatus) {
  let newStatus: TaskStatus = "todo";
  if (currentStatus === "todo") newStatus = "in_progress";
  else if (currentStatus === "in_progress") newStatus = "done";
  else if (currentStatus === "done") newStatus = "todo";
  else newStatus = "todo"; // if cancelled, reset to todo

  return setTaskStatus(taskId, newStatus);
}

export async function deleteTask(taskId: string) {
  const { supabase, user } = await requireUser();

  // Nettoyer les alertes associées
  await resolveEntityNotifications(supabase, taskId, user.id);

  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);

  if (error) throw new Error("Impossible de supprimer la tâche.");

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}
