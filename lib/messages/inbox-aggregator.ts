import { DateTime } from "luxon";
import type { InboxItem, InboxStatus, InboxTab } from "@/components/messages/inbox-types";
import { expenseCategoryLabel } from "@/lib/validation/finances";

interface RawIncome {
  id: string;
  label: string;
  amount: number;
  currency: string;
  due_date: string;
  received: boolean;
  received_at: string | null;
  notes?: string | null;
  created_at: string;
  activity?: { id: string; name: string; color?: string | null } | null;
}

interface RawExpense {
  id: string;
  label: string;
  category?: string | null;
  amount: number;
  currency: string;
  due_date: string;
  paid: boolean;
  paid_at: string | null;
  notes?: string | null;
  created_at: string;
  activity?: { id: string; name: string; color?: string | null } | null;
}

interface RawScheduledExpense {
  id: string;
  name: string;
  category?: string | null;
  amount: number;
  currency: string;
  frequency: string;
  next_due_date: string;
  status: "planned" | "due" | "paid" | "cancelled";
  merchant?: string | null;
  notes?: string | null;
  created_at: string;
  activity?: { id: string; name: string; color?: string | null } | null;
}

interface RawInternalMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  category: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export function buildInboxItems(params: {
  incomeList: RawIncome[];
  expenseList: RawExpense[];
  scheduledList: RawScheduledExpense[];
  messagesList: RawInternalMessage[];
  timezone: string;
}): InboxItem[] {
  const { incomeList, expenseList, scheduledList, messagesList, timezone } = params;
  const now = DateTime.now().setZone(timezone);
  const today = now.toISODate()!;

  const items: InboxItem[] = [];

  // 1. REVENUS (income)
  for (const inc of incomeList) {
    let tab: InboxTab = "pending";
    let status: InboxStatus = "pending";
    let statusLabel = "Revenu attendu";

    if (inc.received) {
      tab = "history";
      status = "completed";
      statusLabel = "Encaissé";
    } else {
      if (inc.due_date < today) {
        tab = "todo";
        status = "overdue";
        statusLabel = "Paiement en retard";
      } else if (inc.due_date === today) {
        tab = "todo";
        status = "due_today";
        statusLabel = "Échéance aujourd'hui";
      } else {
        tab = "pending";
        status = "pending";
        statusLabel = "Revenu attendu";
      }
    }

    items.push({
      id: inc.id,
      kind: "income",
      tab,
      title: inc.label,
      description: inc.activity?.name ? `Activité : ${inc.activity.name}` : "Revenu général",
      amount: Number(inc.amount),
      currency: inc.currency || "EUR",
      dueDate: inc.due_date,
      resolvedDate: inc.received_at,
      status,
      statusLabel,
      activityName: inc.activity?.name || null,
      activityColor: inc.activity?.color || null,
      notes: inc.notes || null,
      createdAt: inc.created_at,
    });
  }

  // 2. DÉPENSES (expenses)
  for (const exp of expenseList) {
    let tab: InboxTab = "pending";
    let status: InboxStatus = "pending";
    let statusLabel = "Dépense prévue";

    if (exp.paid) {
      tab = "history";
      status = "completed";
      statusLabel = "Réglée";
    } else {
      if (exp.due_date < today) {
        tab = "todo";
        status = "overdue";
        statusLabel = "Dépense en retard";
      } else if (exp.due_date === today) {
        tab = "todo";
        status = "due_today";
        statusLabel = "À régler aujourd'hui";
      } else {
        tab = "pending";
        status = "pending";
        statusLabel = "Dépense prévue";
      }
    }

    const categoryLabel = expenseCategoryLabel(exp.category);

    items.push({
      id: exp.id,
      kind: "expense",
      tab,
      title: exp.label,
      description: exp.activity?.name
        ? `${categoryLabel} • ${exp.activity.name}`
        : categoryLabel,
      amount: Number(exp.amount),
      currency: exp.currency || "EUR",
      dueDate: exp.due_date,
      resolvedDate: exp.paid_at,
      status,
      statusLabel,
      activityName: exp.activity?.name || null,
      activityColor: exp.activity?.color || null,
      category: exp.category || null,
      notes: exp.notes || null,
      createdAt: exp.created_at,
    });
  }

  // 3. DÉPENSES PROGRAMMÉES (scheduled_expenses)
  for (const sch of scheduledList) {
    let tab: InboxTab = "pending";
    let status: InboxStatus = "pending";
    let statusLabel = "Échéance programmée";

    if (sch.status === "paid" || sch.status === "cancelled") {
      tab = "history";
      status = sch.status === "paid" ? "completed" : "cancelled";
      statusLabel = sch.status === "paid" ? "Payée" : "Annulée";
    } else {
      if (sch.next_due_date < today) {
        tab = "todo";
        status = "overdue";
        statusLabel = "Échéance dépassée";
      } else if (sch.next_due_date === today || sch.status === "due") {
        tab = "todo";
        status = "due_today";
        statusLabel = "À régler aujourd'hui";
      } else {
        tab = "pending";
        status = "pending";
        statusLabel = "Échéance programmée";
      }
    }

    const freqLabels: Record<string, string> = {
      once: "Ponctuelle",
      daily: "Quotidienne",
      weekly: "Hebdomadaire",
      monthly: "Mensuelle",
      quarterly: "Trimestrielle",
      yearly: "Annuelle",
    };
    const freqText = freqLabels[sch.frequency] || sch.frequency;

    items.push({
      id: sch.id,
      kind: "scheduled_expense",
      tab,
      title: sch.name,
      description: `Récurrence ${freqText}${sch.merchant ? ` • ${sch.merchant}` : ""}`,
      amount: Number(sch.amount),
      currency: sch.currency || "EUR",
      dueDate: sch.next_due_date,
      status,
      statusLabel,
      activityName: sch.activity?.name || null,
      activityColor: sch.activity?.color || null,
      category: sch.category || null,
      merchant: sch.merchant || null,
      frequency: sch.frequency,
      notes: sch.notes || null,
      createdAt: sch.created_at,
    });
  }

  // 4. MESSAGES INTERNES & BILANS OFFICIELS
  for (const msg of messagesList) {
    const isFinancial = msg.category === "financial";
    const isSummary = msg.category === "summary";

    let tab: InboxTab = "history";
    let status: InboxStatus = "info";
    let statusLabel = isFinancial ? "Alerte financière" : isSummary ? "Bilan" : "Message";

    // Si message financier non lu, placer dans "À traiter" pour capter l'attention
    if (isFinancial && !msg.is_read) {
      tab = "todo";
      status = "info";
      statusLabel = "Notification financière";
    }

    items.push({
      id: msg.id,
      kind: "message",
      tab,
      title: msg.subject,
      description: `De ${msg.sender}`,
      body: msg.body,
      sender: msg.sender,
      isRead: msg.is_read,
      status,
      statusLabel,
      category: msg.category,
      createdAt: msg.created_at,
    });
  }

  // Tri déterministe et stable :
  // Dans "À traiter" : Échéances les plus anciennes en premier (les plus urgentes d'abord)
  // Dans "En attente" : Échéances les plus proches d'abord (chronologique croissant)
  // Dans "Historique" : Les plus récentes résolutions d'abord (chronologique décroissant)
  return items.sort((a, b) => {
    const dateA = a.dueDate || a.createdAt;
    const dateB = b.dueDate || b.createdAt;

    if (a.tab === "todo") {
      // Priorité aux statuts critiques : overdue avant due_today avant info
      const priorityOrder: Record<InboxStatus, number> = {
        overdue: 1,
        due_today: 2,
        pending: 3,
        info: 4,
        completed: 5,
        cancelled: 6,
      };
      const prioDiff = (priorityOrder[a.status] || 9) - (priorityOrder[b.status] || 9);
      if (prioDiff !== 0) return prioDiff;
      return dateA.localeCompare(dateB);
    }

    if (a.tab === "pending") {
      return dateA.localeCompare(dateB);
    }

    // Historique : plus récent en premier
    return dateB.localeCompare(dateA);
  });
}
