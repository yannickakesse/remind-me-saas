"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import {
  incomeFormSchema,
  expenseFormSchema,
  budgetFormSchema,
  savingsGoalFormSchema,
  scheduledExpenseFormSchema,
} from "@/lib/validation/finances";
import {
  assertCanCreateBudget,
  assertCanCreateSavingsGoal,
} from "@/lib/subscriptions/server";
import {
  resolveEntityNotifications,
  invalidateOutdatedEntityReminders,
  triggerProactiveReminders,
} from "@/lib/notifications/engine";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ----------------------------------------------------------------------------
// REVENUS (Income)
// ----------------------------------------------------------------------------
export async function createIncome(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = incomeFormSchema.parse({
    activityId: formData.get("activityId") || "",
    label: formData.get("label"),
    incomeType: formData.get("incomeType") || "contract",
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    paymentMethod: formData.get("paymentMethod") || undefined,
    reference: formData.get("reference") || undefined,
    dueDate: formData.get("dueDate") || "",
    notes: formData.get("notes") || undefined,
  });

  const { error } = await supabase.from("income").insert({
    user_id: user.id,
    activity_id: parsed.activityId || null,
    label: parsed.label,
    amount: parsed.amount,
    currency: parsed.currency,
    due_date: parsed.dueDate || new Date().toISOString().slice(0, 10),
    notes: parsed.notes || null,
  });

  if (error) throw new Error("Impossible d'ajouter le revenu.");

  // Évaluation immédiate des rappels pour le nouveau paiement
  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/reports");
  redirect("/finances?tab=income");
}

export async function updateIncome(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = incomeFormSchema.parse({
    activityId: formData.get("activityId") || "",
    label: formData.get("label"),
    incomeType: formData.get("incomeType") || "contract",
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    paymentMethod: formData.get("paymentMethod") || undefined,
    reference: formData.get("reference") || undefined,
    dueDate: formData.get("dueDate") || "",
    notes: formData.get("notes") || undefined,
  });

  const { error } = await supabase
    .from("income")
    .update({
      activity_id: parsed.activityId || null,
      label: parsed.label,
      amount: parsed.amount,
      currency: parsed.currency,
      due_date: parsed.dueDate || new Date().toISOString().slice(0, 10),
      notes: parsed.notes || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de mettre à jour le revenu.");

  await invalidateOutdatedEntityReminders(supabase, id, user.id);
  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/reports");
  redirect("/finances?tab=income");
}

export async function setIncomeReceived(id: string, received: boolean) {
  const { supabase, user } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("income")
    .update({
      received,
      received_at: received ? today : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Erreur de mise à jour.");

  // Auto-Stop immédiat si marqué comme reçu
  if (received) {
    await resolveEntityNotifications(supabase, id, user.id);
  } else {
    await triggerProactiveReminders(supabase, user.id);
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/reports");
}

export async function postponeIncomeAction(id: string, days: number = 7) {
  const { supabase, user } = await requireUser();
  const { data: current } = await supabase
    .from("income")
    .select("due_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!current) throw new Error("Revenu introuvable.");

  const curDate = new Date(current.due_date || new Date());
  curDate.setDate(curDate.getDate() + days);
  const newDueDate = curDate.toISOString().slice(0, 10);

  const { error } = await supabase
    .from("income")
    .update({ due_date: newDueDate })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Erreur lors du report du revenu.");

  // Désactiver les anciens rappels et recalibrer
  await invalidateOutdatedEntityReminders(supabase, id, user.id);
  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function deleteIncome(id: string) {
  const { supabase, user } = await requireUser();

  await resolveEntityNotifications(supabase, id, user.id);

  const { error } = await supabase.from("income").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error("Erreur de suppression.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/messages");
  revalidatePath("/reports");
}

// ----------------------------------------------------------------------------
// DÉPENSES (Expenses)
// ----------------------------------------------------------------------------
export async function createExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = expenseFormSchema.parse({
    activityId: formData.get("activityId") || "",
    label: formData.get("label"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    expenseType: formData.get("expenseType") || "personal",
    businessPercentage: formData.get("businessPercentage") || 100,
    merchant: formData.get("merchant") || undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    dueDate: formData.get("dueDate") || "",
    notes: formData.get("notes") || undefined,
  });

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    activity_id: parsed.activityId || null,
    label: parsed.label,
    category: parsed.category,
    amount: parsed.amount,
    currency: parsed.currency,
    due_date: parsed.dueDate || new Date().toISOString().slice(0, 10),
    notes: parsed.notes || null,
  });

  if (error) throw new Error("Impossible d'ajouter la dépense.");

  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/reports");
  redirect("/finances?tab=expenses");
}

export async function updateExpense(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = expenseFormSchema.parse({
    activityId: formData.get("activityId") || "",
    label: formData.get("label"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    expenseType: formData.get("expenseType") || "personal",
    businessPercentage: formData.get("businessPercentage") || 100,
    merchant: formData.get("merchant") || undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    dueDate: formData.get("dueDate") || "",
    notes: formData.get("notes") || undefined,
  });

  const { error } = await supabase
    .from("expenses")
    .update({
      activity_id: parsed.activityId || null,
      label: parsed.label,
      category: parsed.category,
      amount: parsed.amount,
      currency: parsed.currency,
      due_date: parsed.dueDate || new Date().toISOString().slice(0, 10),
      notes: parsed.notes || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de modifier la dépense.");

  await invalidateOutdatedEntityReminders(supabase, id, user.id);
  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/reports");
  redirect("/finances?tab=expenses");
}

export async function setExpensePaid(id: string, paid: boolean) {
  const { supabase, user } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("expenses")
    .update({
      paid,
      paid_at: paid ? today : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Erreur de mise à jour.");

  // Auto-Stop & Résolution immédiate
  if (paid) {
    await resolveEntityNotifications(supabase, id, user.id);
  } else {
    await triggerProactiveReminders(supabase, user.id);
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/reports");
}

export async function deleteExpense(id: string) {
  const { supabase, user } = await requireUser();

  await resolveEntityNotifications(supabase, id, user.id);

  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error("Erreur de suppression.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/reports");
}

// ----------------------------------------------------------------------------
// BUDGETS
// ----------------------------------------------------------------------------
export async function createBudget(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    await assertCanCreateBudget(supabase, user.id);
    const parsed = budgetFormSchema.parse({
      category: formData.get("category"),
      monthlyLimit: formData.get("monthlyLimit"),
      currency: formData.get("currency"),
      notes: formData.get("notes") || undefined,
    });

    const { error } = await supabase.from("budgets").insert({
      user_id: user.id,
      category: parsed.category,
      monthly_limit: parsed.monthlyLimit,
      currency: parsed.currency,
      notes: parsed.notes || null,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Un budget existe déjà pour cette catégorie et devise." };
      }
      return { success: false, error: error.message || "Impossible de créer le budget." };
    }
    revalidatePath("/finances");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la création du budget." };
  }
}

export async function updateBudget(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = budgetFormSchema.parse({
      category: formData.get("category"),
      monthlyLimit: formData.get("monthlyLimit"),
      currency: formData.get("currency"),
      notes: formData.get("notes") || undefined,
    });

    const { error } = await supabase
      .from("budgets")
      .update({
        monthly_limit: parsed.monthlyLimit,
        notes: parsed.notes || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message || "Impossible de mettre à jour le budget." };
    revalidatePath("/finances");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la mise à jour du budget." };
  }
}

export async function deleteBudget(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error("Impossible de supprimer le budget.");
  revalidatePath("/finances");
}

// ----------------------------------------------------------------------------
// OBJECTIFS D'ÉPARGNE & POCHES
// ----------------------------------------------------------------------------
export async function createSavingsGoal(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    await assertCanCreateSavingsGoal(supabase, user.id);
    const parsed = savingsGoalFormSchema.parse({
      name: formData.get("name"),
      category: formData.get("category") || "other",
      targetAmount: formData.get("targetAmount"),
      currentAmount: formData.get("currentAmount") || 0,
      currency: formData.get("currency"),
      deadline: formData.get("deadline") || "",
      monthlyContribution: formData.get("monthlyContribution") || undefined,
      notes: formData.get("notes") || undefined,
    });

    const { error } = await supabase.from("savings_goals").insert({
      user_id: user.id,
      name: parsed.name,
      category: parsed.category,
      target_amount: parsed.targetAmount,
      current_amount: parsed.currentAmount,
      currency: parsed.currency,
      deadline: parsed.deadline || null,
      monthly_contribution: parsed.monthlyContribution || null,
      notes: parsed.notes || null,
    });

    if (error) return { success: false, error: error.message || "Impossible de créer l'objectif d'épargne." };
    revalidatePath("/finances");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la création de l'objectif." };
  }
}

export async function updateSavingsGoal(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = savingsGoalFormSchema.parse({
      name: formData.get("name"),
      category: formData.get("category") || "other",
      targetAmount: formData.get("targetAmount"),
      currentAmount: formData.get("currentAmount") || 0,
      currency: formData.get("currency"),
      deadline: formData.get("deadline") || "",
      monthlyContribution: formData.get("monthlyContribution") || undefined,
      notes: formData.get("notes") || undefined,
    });

    const { error } = await supabase
      .from("savings_goals")
      .update({
        name: parsed.name,
        category: parsed.category,
        target_amount: parsed.targetAmount,
        current_amount: parsed.currentAmount,
        deadline: parsed.deadline || null,
        monthly_contribution: parsed.monthlyContribution || null,
        notes: parsed.notes || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message || "Impossible de modifier l'objectif." };
    revalidatePath("/finances");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la modification de l'objectif." };
  }
}

export async function adjustSavingsGoalAmount(id: string, delta: number) {
  const { supabase, user } = await requireUser();
  const { data: goal } = await supabase
    .from("savings_goals")
    .select("current_amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!goal) throw new Error("Objectif introuvable.");

  const newAmount = Math.max(0, Number(goal.current_amount) + delta);

  const { error } = await supabase
    .from("savings_goals")
    .update({ current_amount: newAmount })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Erreur lors de l'ajustement du solde.");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

export async function deleteSavingsGoal(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("savings_goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error("Impossible de supprimer l'objectif.");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

// ============================================================================
// ACTIONS DÉPENSES PROGRAMMÉES
// ============================================================================
export async function createScheduledExpenseAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();

    const rawActivityId = formData.get("activityId");
    const activityId =
      typeof rawActivityId === "string" && rawActivityId.trim().length > 0 && rawActivityId !== "null" && rawActivityId !== "undefined"
        ? rawActivityId.trim()
        : null;

    const rawName = formData.get("name")?.toString().trim() || "";
    const rawAmount = formData.get("amount");
    const rawCurrency = (formData.get("currency")?.toString().trim() || "XOF").toUpperCase();
    const rawFrequency = (formData.get("frequency")?.toString().trim() || "monthly") as any;
    const rawNextDueDate = formData.get("nextDueDate")?.toString().trim() || new Date().toISOString().split("T")[0];
    const rawCategory = formData.get("category")?.toString().trim() || "other";
    const rawMerchant = formData.get("merchant")?.toString().trim() || null;
    const rawPaymentMethod = formData.get("paymentMethod")?.toString().trim() || null;
    const rawNotes = formData.get("notes")?.toString().trim() || null;

    const parsed = scheduledExpenseFormSchema.parse({
      name: rawName,
      category: rawCategory,
      amount: rawAmount,
      currency: rawCurrency,
      frequency: rawFrequency,
      nextDueDate: rawNextDueDate,
      activityId: activityId ?? undefined,
      merchant: rawMerchant ?? undefined,
      paymentMethod: rawPaymentMethod ?? undefined,
      notes: rawNotes ?? undefined,
    });

    const { error } = await supabase.from("scheduled_expenses").insert({
      user_id: user.id,
      name: parsed.name,
      category: parsed.category || "other",
      amount: parsed.amount,
      currency: parsed.currency,
      frequency: parsed.frequency,
      start_date: parsed.nextDueDate,
      next_due_date: parsed.nextDueDate,
      status: "planned",
      activity_id: activityId,
      merchant: rawMerchant,
      payment_method: rawPaymentMethod,
      notes: rawNotes,
    });

    if (error) {
      console.error("Erreur insertion scheduled_expenses :", error);
      return { success: false, error: error.message || "Impossible de créer la dépense programmée." };
    }

    await triggerProactiveReminders(supabase, user.id);

    revalidatePath("/finances");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la programmation de la dépense." };
  }
}

export async function deleteScheduledExpenseAction(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await resolveEntityNotifications(supabase, id, user.id);
  await supabase.from("scheduled_expenses").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/notifications");
  revalidatePath("/messages");
}

export async function cancelScheduledExpenseAction(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase
    .from("scheduled_expenses")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id);

  // Auto-Stop immédiat des rappels pour cette dépense annulée
  await resolveEntityNotifications(supabase, id, user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/notifications");
  revalidatePath("/messages");
}

export async function postponeScheduledExpenseAction(id: string, days: number = 7) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: item } = await supabase
    .from("scheduled_expenses")
    .select("next_due_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!item) throw new Error("Dépense programmée introuvable.");

  const curDate = new Date(item.next_due_date || new Date());
  curDate.setDate(curDate.getDate() + days);
  const nextDueDateStr = curDate.toISOString().slice(0, 10);

  await supabase
    .from("scheduled_expenses")
    .update({ next_due_date: nextDueDateStr })
    .eq("id", id)
    .eq("user_id", user.id);

  await invalidateOutdatedEntityReminders(supabase, id, user.id);
  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/notifications");
  revalidatePath("/messages");
}

export async function markScheduledExpensePaidAction(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: item } = await supabase
    .from("scheduled_expenses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!item) return;

  // Garde d'idempotence : si l'échéance ponctuelle est déjà payée, ne rien réinsérer
  if (item.frequency === "once" && item.status === "paid") {
    await resolveEntityNotifications(supabase, id, user.id);
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  // Garde anti-doublon : vérifier si la dépense a déjà été insérée pour cette échéance exacte
  const { data: existingExp } = await supabase
    .from("expenses")
    .select("id")
    .eq("user_id", user.id)
    .eq("due_date", item.next_due_date)
    .eq("amount", Number(item.amount) || 0)
    .eq("label", item.name)
    .maybeSingle();

  if (!existingExp) {
    // 1. Enregistrer la dépense payée dans la table expenses
    await supabase.from("expenses").insert({
      user_id: user.id,
      label: item.name,
      category: item.category,
      amount: item.amount,
      currency: item.currency,
      due_date: item.next_due_date,
      paid: true,
      paid_at: today,
      activity_id: item.activity_id,
      notes: item.notes ? `Issu de la dépense programmée : ${item.notes}` : "Issu d'une dépense programmée",
    });
  }

  // Auto-Stop des rappels pour l'échéance passée
  await resolveEntityNotifications(supabase, id, user.id);

  // 2. Mettre à jour l'échéance ou le statut
  if (item.frequency === "once") {
    await supabase
      .from("scheduled_expenses")
      .update({ status: "paid" })
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    // Calculer la prochaine date selon la fréquence sans dérive UTC
    const curDT = DateTime.fromISO(item.next_due_date);
    let nextDT = curDT;

    if (item.frequency === "daily") nextDT = curDT.plus({ days: 1 });
    else if (item.frequency === "weekly") nextDT = curDT.plus({ weeks: 1 });
    else if (item.frequency === "monthly") nextDT = curDT.plus({ months: 1 });
    else if (item.frequency === "quarterly") nextDT = curDT.plus({ months: 3 });
    else if (item.frequency === "yearly") nextDT = curDT.plus({ years: 1 });

    const nextDueDateStr = nextDT.toISODate()!;

    // Respect strict des dates de contrat et d'expiration
    if (item.end_date && nextDueDateStr > item.end_date) {
      await supabase
        .from("scheduled_expenses")
        .update({
          status: "paid",
        })
        .eq("id", id)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("scheduled_expenses")
        .update({
          next_due_date: nextDueDateStr,
          status: "planned",
        })
        .eq("id", id)
        .eq("user_id", user.id);
    }
  }

  await triggerProactiveReminders(supabase, user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/notifications");
  revalidatePath("/messages");
  revalidatePath("/reports");
}
