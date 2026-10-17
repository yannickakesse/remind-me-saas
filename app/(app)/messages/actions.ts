"use server";

import { revalidatePath } from "next/cache";
import {
  setIncomeReceived,
  setExpensePaid,
  markScheduledExpensePaidAction,
  postponeIncomeAction,
  postponeScheduledExpenseAction,
} from "@/app/(app)/finances/actions";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { markInternalMessageAsRead } from "@/lib/messages/service";

/**
 * Encaisser un revenu depuis l'Inbox.
 * Met à jour le statut réel en base (income.received = true, received_at = today),
 * résout automatiquement les notifications associées, et revalide l'ensemble des pages.
 */
export async function executeInboxIncomeReceived(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await setIncomeReceived(id, true);
    revalidatePath("/messages");
    revalidatePath("/finances");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    console.error("[executeInboxIncomeReceived] Error:", err?.message || err);
    return { success: false, error: err?.message || "Erreur lors de l'encaissement" };
  }
}

/**
 * Régler une dépense ponctuelle depuis l'Inbox.
 * Met à jour le statut réel en base (expenses.paid = true, paid_at = today),
 * résout automatiquement les notifications associées, et revalide l'ensemble des pages.
 */
export async function executeInboxExpensePaid(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await setExpensePaid(id, true);
    revalidatePath("/messages");
    revalidatePath("/finances");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    console.error("[executeInboxExpensePaid] Error:", err?.message || err);
    return { success: false, error: err?.message || "Erreur lors du règlement" };
  }
}

/**
 * Régler une échéance de dépense programmée depuis l'Inbox.
 * Insère la dépense réelle payée dans `expenses`, avance l'échéance selon la récurrence,
 * résout les notifications correspondantes, et revalide les pages.
 */
export async function executeInboxScheduledExpensePaid(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await markScheduledExpensePaidAction(id);
    revalidatePath("/messages");
    revalidatePath("/finances");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    console.error("[executeInboxScheduledExpensePaid] Error:", err?.message || err);
    return { success: false, error: err?.message || "Erreur lors du règlement de l'échéance" };
  }
}

/**
 * Reporter l'échéance d'un revenu de N jours depuis l'Inbox.
 */
export async function executeInboxPostponeIncome(id: string, days: number = 7): Promise<{ success: boolean; error?: string }> {
  try {
    await postponeIncomeAction(id, days);
    revalidatePath("/messages");
    revalidatePath("/finances");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    console.error("[executeInboxPostponeIncome] Error:", err?.message || err);
    return { success: false, error: err?.message || "Erreur lors du report" };
  }
}

/**
 * Reporter l'échéance d'une dépense programmée de N jours depuis l'Inbox.
 */
export async function executeInboxPostponeScheduledExpense(id: string, days: number = 7): Promise<{ success: boolean; error?: string }> {
  try {
    await postponeScheduledExpenseAction(id, days);
    revalidatePath("/messages");
    revalidatePath("/finances");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: any) {
    console.error("[executeInboxPostponeScheduledExpense] Error:", err?.message || err);
    return { success: false, error: err?.message || "Erreur lors du report" };
  }
}

/**
 * Marquer un message de l'Inbox comme lu.
 */
export async function executeInboxMarkMessageRead(messageId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireCurrentUser();
    const supabase = createClient();
    await markInternalMessageAsRead(supabase, user.id, messageId);
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    console.error("[executeInboxMarkMessageRead] Error:", err?.message || err);
    return { success: false, error: err?.message || "Erreur de marquage comme lu" };
  }
}
