"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  incomeFormSchema,
  expenseFormSchema,
  budgetFormSchema,
  savingsGoalFormSchema,
  scheduledExpenseFormSchema,
} from "@/lib/validation/finances";

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

  revalidatePath("/finances");
  revalidatePath("/dashboard");
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

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  redirect("/finances?tab=income");
}

export async function setIncomeReceived(id: string, received: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("income")
    .update({ received })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Erreur de mise à jour.");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

export async function deleteIncome(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("income").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error("Erreur de suppression.");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
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

  revalidatePath("/finances");
  revalidatePath("/dashboard");
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

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  redirect("/finances?tab=expenses");
}

export async function setExpensePaid(id: string, paid: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("expenses")
    .update({ paid })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Erreur de mise à jour.");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

export async function deleteExpense(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error("Erreur de suppression.");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

// ----------------------------------------------------------------------------
// BUDGETS
// ----------------------------------------------------------------------------
export async function createBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
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

  if (error) throw new Error("Ce budget existe déjà pour cette catégorie.");
  revalidatePath("/finances");
}

export async function updateBudget(id: string, formData: FormData) {
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

  if (error) throw new Error("Impossible de mettre à jour le budget.");
  revalidatePath("/finances");
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
export async function createSavingsGoal(formData: FormData) {
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

  if (error) throw new Error("Impossible de créer l'objectif d'épargne.");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

export async function updateSavingsGoal(id: string, formData: FormData) {
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

  if (error) throw new Error("Impossible de modifier l'objectif.");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
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
export async function createScheduledExpenseAction(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = scheduledExpenseFormSchema.parse({
    name: formData.get("name"),
    category: formData.get("category") || "utilities",
    amount: formData.get("amount"),
    currency: formData.get("currency") || "XOF",
    frequency: formData.get("frequency") || "monthly",
    nextDueDate: formData.get("nextDueDate") || new Date().toISOString().split("T")[0],
    activityId: formData.get("activityId") || undefined,
    merchant: formData.get("merchant") || undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const { error } = await supabase.from("scheduled_expenses").insert({
    user_id: user.id,
    name: parsed.name,
    category: parsed.category,
    amount: parsed.amount,
    currency: parsed.currency,
    frequency: parsed.frequency,
    start_date: parsed.nextDueDate,
    next_due_date: parsed.nextDueDate,
    status: "planned",
    activity_id: parsed.activityId || null,
    merchant: parsed.merchant || null,
    payment_method: parsed.paymentMethod || null,
    notes: parsed.notes || null,
  });

  if (error) throw new Error("Impossible de créer la dépense programmée.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function deleteScheduledExpenseAction(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase.from("scheduled_expenses").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
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

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
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

  const today = new Date().toISOString().split("T")[0];

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

  // 2. Mettre à jour l'échéance ou le statut
  if (item.frequency === "once") {
    await supabase
      .from("scheduled_expenses")
      .update({ status: "paid" })
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    // Calculer la prochaine date selon la fréquence
    const curDate = new Date(item.next_due_date);
    let nextDate = new Date(curDate);

    if (item.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
    else if (item.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else if (item.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
    else if (item.frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
    else if (item.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);

    const nextDueDateStr = nextDate.toISOString().split("T")[0];

    await supabase
      .from("scheduled_expenses")
      .update({
        next_due_date: nextDueDateStr,
        status: "planned",
      })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}
