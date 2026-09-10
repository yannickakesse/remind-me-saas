// Types écrits manuellement, étendus jusqu'à la Phase 4 (tasks).
// Chaque table déclare désormais son tableau `Relationships` (clés
// étrangères), indispensable pour que le client Supabase type
// correctement les jointures imbriquées (ex. .select("*, organizations(name)")).
// Sans cette propriété, TypeScript résout ces champs joints en `never` —
// c'est la cause du bug de build Netlify rencontré en Phase 4.
// À remplacer par `supabase gen types typescript --linked > types/database.ts`
// dès que possible : plus fiable qu'un maintien manuel, et à refaire à
// chaque nouvelle migration (Phase 5 — Finances incluse).

export interface Database {
  public: {
    Tables: {
      scheduled_expenses: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string | null;
          name: string;
          category: string;
          amount: number;
          currency: string;
          frequency: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
          start_date: string;
          end_date: string | null;
          next_due_date: string;
          status: "planned" | "due" | "paid" | "cancelled";
          merchant: string | null;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_id?: string | null;
          name: string;
          category: string;
          amount: number;
          currency: string;
          frequency?: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
          start_date: string;
          end_date?: string | null;
          next_due_date: string;
          status?: "planned" | "due" | "paid" | "cancelled";
          merchant?: string | null;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_id?: string | null;
          name?: string;
          category?: string;
          amount?: number;
          currency?: string;
          frequency?: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
          start_date?: string;
          end_date?: string | null;
          next_due_date?: string;
          status?: "planned" | "due" | "paid" | "cancelled";
          merchant?: string | null;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      countries: {
        Row: {
          code: string;
          name: string;
          default_locale: string;
        };
        Insert: {
          code: string;
          name: string;
          default_locale?: string;
        };
        Update: Partial<Database["public"]["Tables"]["countries"]["Insert"]>;
        Relationships: [];
      };
      currencies: {
        Row: {
          code: string;
          name: string;
          symbol: string;
        };
        Insert: {
          code: string;
          name: string;
          symbol: string;
        };
        Update: Partial<Database["public"]["Tables"]["currencies"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          country_code: string | null;
          default_currency: string | null;
          timezone: string;
          locale: string;
          week_start: number;
          time_format: string;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          country_code?: string | null;
          default_currency?: string | null;
          timezone?: string;
          locale?: string;
          week_start?: number;
          time_format?: string;
          onboarding_completed?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          notif_prefs: Record<string, unknown>;
          ui_prefs: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          user_id: string;
          notif_prefs?: Record<string, unknown>;
          ui_prefs?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: "free" | "pro" | "premium";
          status: string;
          current_period_end: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: "free" | "pro" | "premium";
          status?: string;
          current_period_end?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          category: string | null;
          icon: string | null;
          color: string | null;
          type: ActivityType;
          status: "active" | "archived";
          organization_id: string | null;
          contact_id: string | null;
          work_mode: "remote" | "onsite" | "hybrid" | null;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          category?: string | null;
          icon?: string | null;
          color?: string | null;
          type: ActivityType;
          status?: "active" | "archived";
          organization_id?: string | null;
          contact_id?: string | null;
          work_mode?: "remote" | "onsite" | "hybrid" | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "activities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          }
        ];
      };
      activity_schedules: {
        Row: {
          id: string;
          activity_id: string;
          user_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          break_minutes: number;
          recurrence: "weekly" | "biweekly" | "custom";
          variable_hours: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          user_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          break_minutes?: number;
          recurrence?: "weekly" | "biweekly" | "custom";
          variable_hours?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["activity_schedules"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "activity_schedules_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          }
        ];
      };
      activity_compensation: {
        Row: {
          id: string;
          activity_id: string;
          user_id: string;
          amount: number;
          currency: string;
          frequency: CompensationFrequency;
          payment_day: number | null;
          payment_terms: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          user_id: string;
          amount: number;
          currency: string;
          frequency: CompensationFrequency;
          payment_day?: number | null;
          payment_terms?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["activity_compensation"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "activity_compensation_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: true;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          }
        ];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string;
          schedule_id: string | null;
          title: string;
          starts_at: string;
          ends_at: string;
          status: CalendarEventStatus;
          is_exception: boolean;
          original_starts_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_id: string;
          schedule_id?: string | null;
          title: string;
          starts_at: string;
          ends_at: string;
          status?: CalendarEventStatus;
          is_exception?: boolean;
          original_starts_at?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "calendar_events_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "activity_schedules";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string | null;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          due_date: string | null;
          due_time: string | null;
          reminder_minutes_before: number | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_id?: string | null;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          due_time?: string | null;
          reminder_minutes_before?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tasks_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          }
        ];
      };
      income: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string | null;
          compensation_id: string | null;
          label: string;
          amount: number;
          currency: string;
          due_date: string;
          received: boolean;
          received_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_id?: string | null;
          compensation_id?: string | null;
          label: string;
          amount: number;
          currency: string;
          due_date: string;
          received?: boolean;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["income"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "income_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "income_compensation_id_fkey";
            columns: ["compensation_id"];
            isOneToOne: false;
            referencedRelation: "activity_compensation";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string | null;
          label: string;
          category: string | null;
          amount: number;
          currency: string;
          due_date: string;
          paid: boolean;
          paid_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_id?: string | null;
          label: string;
          category?: string | null;
          amount: number;
          currency: string;
          due_date: string;
          paid?: boolean;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "expenses_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          }
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          monthly_limit: number;
          currency: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          monthly_limit: number;
          currency: string;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: SavingsCategory;
          target_amount: number;
          current_amount: number;
          currency: string;
          deadline: string | null;
          monthly_contribution: number | null;
          color: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: SavingsCategory;
          target_amount: number;
          current_amount?: number;
          currency: string;
          deadline?: string | null;
          monthly_contribution?: number | null;
          color?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["savings_goals"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          category: string;
          priority: NotificationPriority;
          status: NotificationStatus;
          entity_type: string;
          entity_id: string;
          title: string;
          body: string;
          title_key: string | null;
          body_key: string | null;
          metadata: Record<string, any>;
          link: string;
          scheduled_at: string | null;
          read_at: string | null;
          actioned_at: string | null;
          resolved_at: string | null;
          snoozed_until: string | null;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          category?: string;
          priority?: NotificationPriority;
          status?: NotificationStatus;
          entity_type?: string;
          entity_id?: string;
          title: string;
          body?: string;
          title_key?: string | null;
          body_key?: string | null;
          metadata?: Record<string, any>;
          link?: string;
          scheduled_at?: string | null;
          read_at?: string | null;
          actioned_at?: string | null;
          resolved_at?: string | null;
          snoozed_until?: string | null;
          idempotency_key?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          email_enabled: boolean;
          in_app_enabled: boolean;
          activity_reminders: boolean;
          payment_reminders: boolean;
          expense_reminders: boolean;
          task_reminders: boolean;
          conflict_alerts: boolean;
          activity_lead_times: number[];
          payment_lead_days: number[];
          expense_lead_days: number[];
          task_lead_hours: number[];
          quiet_hours_enabled: boolean;
          quiet_hours_start: string;
          quiet_hours_end: string;
          preferred_locale: SupportedLocale;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email_enabled?: boolean;
          in_app_enabled?: boolean;
          activity_reminders?: boolean;
          payment_reminders?: boolean;
          expense_reminders?: boolean;
          task_reminders?: boolean;
          conflict_alerts?: boolean;
          activity_lead_times?: number[];
          payment_lead_days?: number[];
          expense_lead_days?: number[];
          task_lead_hours?: number[];
          quiet_hours_enabled?: boolean;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          preferred_locale?: SupportedLocale;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_preferences"]["Insert"]>;
        Relationships: [];
      };
      notification_logs: {
        Row: {
          id: string;
          user_id: string;
          notification_id: string | null;
          channel: "in_app" | "email" | "push";
          recipient: string | null;
          template: string;
          locale: string;
          delivery_status: "queued" | "sent" | "delivered" | "failed" | "simulated_dev";
          idempotency_key: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_id?: string | null;
          channel: "in_app" | "email" | "push";
          recipient?: string | null;
          template: string;
          locale?: string;
          delivery_status: "queued" | "sent" | "delivered" | "failed" | "simulated_dev";
          idempotency_key?: string | null;
          error_message?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notification_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_own_account: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ActivityType =
  | "salaried_job"
  | "freelance"
  | "contract"
  | "mission"
  | "own_business"
  | "commerce"
  | "coaching"
  | "consulting"
  | "teaching"
  | "side_activity"
  | "other";

export type CompensationFrequency =
  | "hourly"
  | "daily"
  | "per_session"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "per_project"
  | "one_time";

export type CalendarEventStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "missed"
  | "postponed";

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type NotificationStatus = "unread" | "read" | "dismissed" | "actioned" | "snoozed" | "resolved";
export type NotificationCategory =
  | "activity"
  | "task"
  | "payment"
  | "expense"
  | "scheduled_expense"
  | "finance"
  | "security"
  | "summary"
  | "system"
  | "general";
export type SupportedLocale = "en" | "fr" | "es" | "de" | "pt";

export type NotificationKind = string;
export type NotificationEntityType = "task" | "income" | "expense" | "activity" | "scheduled_expense" | "security" | "system";

export type ExpenseType = "personal" | "business" | "mixed";
export type IncomeType = "salary" | "contract" | "freelance" | "sales" | "coaching" | "dividend" | "other";
export type SavingsCategory = "emergency_fund" | "vacation" | "car" | "business" | "real_estate" | "education" | "equipment" | "other";

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  category: SavingsCategory;
  target_amount: number;
  current_amount: number;
  currency: string;
  deadline: string | null;
  monthly_contribution: number | null;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Income = Database["public"]["Tables"]["income"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];

export type ScheduledExpense = Database["public"]["Tables"]["scheduled_expenses"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationPreference = Database["public"]["Tables"]["notification_preferences"]["Row"];
export type NotificationLog = Database["public"]["Tables"]["notification_logs"]["Row"];
