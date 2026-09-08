"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { incomeFormSchema, expenseFormSchema } from "@/lib/validation/finances";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function parseIncomeForm(formData: FormData) {
  return incomeFormSchema.parse({
    activityId: formData.get("activityId") || "",
    label: formData.get("label"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes") || undefined,
  });
}

function parseExpenseForm(formData: FormData) {
  return expenseFormSchema.parse({
    activityId: formData.get("activityId") || "",
    label: formData.get("label"),
    category: formData.get("category") || undefined,
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes") || undefined,
  });
}

// ---- Revenus ----------------------------------------------------------------

export async function createIncome(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseIncomeForm(formData);

  const { error } = await supabase.from("income").insert({
    user_id: user.id,
    activity_id: parsed.activityId || null,
    compensation_id: null, // toujours manuel depuis ce formulaire
    label: parsed.label,
    amount: parsed.amount,
    currency: parsed.currency,
    due_date: parsed.dueDate,
    notes: parsed.notes || null,
  });

  if (error) throw new Error("Impossible de créer ce revenu. Vérifiez les champs.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  redirect("/finances");
}

export async function updateIncome(incomeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseIncomeForm(formData);

  const { error } = await supabase
    .from("income")
    .update({
      activity_id: parsed.activityId || null,
      label: parsed.label,
      amount: parsed.amount,
      currency: parsed.currency,
      due_date: parsed.dueDate,
      notes: parsed.notes || null,
    })
    .eq("id", incomeId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de modifier ce revenu.");

  revalidatePath("/finances");
  revalidatePath(`/finances/income/${incomeId}/edit`);
  revalidatePath("/dashboard");
  redirect("/finances");
}

export async function setIncomeReceived(incomeId: string, received: boolean) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("income")
    .update({ received })
    .eq("id", incomeId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de mettre à jour ce revenu.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

/**
 * Un revenu généré automatiquement (compensation_id non null) ne peut pas
 * être supprimé : il réapparaîtrait au prochain affichage de la page
 * Finances, la génération paresseuse ne sachant pas qu'il a été retiré
 * volontairement. Même principe que deleteManualEvent côté calendrier, qui
 * filtre sur schedule_id null.
 */
export async function deleteIncome(incomeId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("income")
    .delete()
    .eq("id", incomeId)
    .eq("user_id", user.id)
    .is("compensation_id", null);

  if (error) throw new Error("Impossible de supprimer ce revenu.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

// ---- Dépenses -----------------------------------------------------------------

export async function createExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseExpenseForm(formData);

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    activity_id: parsed.activityId || null,
    label: parsed.label,
    category: parsed.category || null,
    amount: parsed.amount,
    currency: parsed.currency,
    due_date: parsed.dueDate,
    notes: parsed.notes || null,
  });

  if (error) throw new Error("Impossible de créer cette dépense. Vérifiez les champs.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  redirect("/finances");
}

export async function updateExpense(expenseId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseExpenseForm(formData);

  const { error } = await supabase
    .from("expenses")
    .update({
      activity_id: parsed.activityId || null,
      label: parsed.label,
      category: parsed.category || null,
      amount: parsed.amount,
      currency: parsed.currency,
      due_date: parsed.dueDate,
      notes: parsed.notes || null,
    })
    .eq("id", expenseId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de modifier cette dépense.");

  revalidatePath("/finances");
  revalidatePath(`/finances/expenses/${expenseId}/edit`);
  revalidatePath("/dashboard");
  redirect("/finances");
}

export async function setExpensePaid(expenseId: string, paid: boolean) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("expenses")
    .update({ paid })
    .eq("id", expenseId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de mettre à jour cette dépense.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

export async function deleteExpense(expenseId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("expenses").delete().eq("id", expenseId).eq("user_id", user.id);

  if (error) throw new Error("Impossible de supprimer cette dépense.");

  revalidatePath("/finances");
  revalidatePath("/dashboard");
}
