export type InboxItemKind = "income" | "expense" | "scheduled_expense" | "message";
export type InboxTab = "todo" | "pending" | "history";
export type InboxStatus = "overdue" | "due_today" | "pending" | "completed" | "cancelled" | "info";

export interface InboxItem {
  id: string;
  kind: InboxItemKind;
  tab: InboxTab;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  dueDate?: string; // YYYY-MM-DD
  resolvedDate?: string | null;
  status: InboxStatus;
  statusLabel: string;
  activityName?: string | null;
  activityColor?: string | null;
  category?: string | null;
  merchant?: string | null;
  frequency?: string | null;
  notes?: string | null;
  createdAt: string;
  // Spécifique aux messages internes
  body?: string;
  sender?: string;
  isRead?: boolean;
}
