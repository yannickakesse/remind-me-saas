"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  AlertCircle,
  Briefcase,
  Calendar,
  CheckSquare,
  Wallet,
  AlertTriangle,
  Sun,
  Moon,
  Loader2,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { playVoiceReminder, stopVoiceReminder, getLocalVoiceSettings } from "@/lib/voice";
import type { Notification, NotificationPriority } from "@/types/database";
import {
  markNotificationRead,
  markAllNotificationsRead,
  markAllNotificationsResolved,
  resolveNotification,
  markEventMissedAction,
  postponeEventAction,
  postponeTaskAction,
  snoozeNotification,
  deleteNotification,
  validateDailySummaryAction,
  acceptEvolutionAction,
  declineEvolutionAction,
  keepExpiredAction,
  quickRenewActivityAction,
} from "@/app/(app)/notifications/actions";
import { useLanguage } from "@/components/i18n/language-provider";
import { useToast } from "@/components/ui/toast";
import { formatDateLocale } from "@/lib/i18n/format";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";

export type FilterType =
  | "all"
  | "activity"
  | "session"
  | "task"
  | "finance"
  | "evolution"
  | "expiration";

export type FilterStatus =
  | "all"
  | "unread"
  | "read"
  | "action_pending"
  | "resolved"
  | "dismissed";

export type FilterPeriod =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "custom";

export type FilterPriority =
  | "all"
  | "critical"
  | "high"
  | "action_required"
  | "normal";

interface NotificationsCenterProps {
  initialNotifications: Notification[];
  timezone: string;
  activities?: Array<{ id: string; name: string }>;
}

type TabKey = "active" | "unread" | "tasks" | "finances" | "history" | "all";

function isDayTime(isoString?: string | null, tz: string = "UTC"): boolean {
  if (!isoString) return true;
  try {
    const dt = DateTime.fromISO(isoString, { zone: tz });
    if (!dt.isValid) return true;
    return dt.hour >= 6 && dt.hour < 18;
  } catch {
    return true;
  }
}

function isNotificationActionable(n: Notification): boolean {
  const isResolved = n.status === "resolved" || n.status === "dismissed" || n.status === "actioned";
  if (isResolved) return false;

  return (
    n.kind === "activity_routine_suggestion" ||
    n.kind === "activity_expired" ||
    n.kind === "activity_expiring_soon" ||
    n.entity_type === "daily_summary" ||
    n.kind === "evening_checkin" ||
    Boolean(n.metadata && (n.metadata as any).is_daily_summary) ||
    Boolean((n.category === "task" || n.entity_type === "task") && n.entity_id) ||
    Boolean((n.category === "payment" || n.entity_type === "income") && n.entity_id) ||
    Boolean((n.category === "expense" || n.entity_type === "expense" || n.entity_type === "scheduled_expense") && n.entity_id) ||
    Boolean(
      (n.category === "activity" || n.entity_type === "activity" || n.kind.includes("activity")) &&
      n.entity_id &&
      !n.kind.includes("activity_upcoming") &&
      !(n.metadata && (n.metadata as any).is_informative)
    )
  );
}

export function NotificationsCenter({ initialNotifications, timezone, activities = [] }: NotificationsCenterProps) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const { push: showToast } = useToast();
  const [, startTransition] = useTransition();

  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  // Synchronisation continue : réagir immédiatement aux actions prises depuis l'Inbox ou les Finances
  useEffect(() => {
    const handleSync = () => {
      startTransition(() => {
        router.refresh();
      });
    };
    window.addEventListener("remindme:finances-updated", handleSync);
    window.addEventListener("remindme:notifications-updated", handleSync);
    return () => {
      window.removeEventListener("remindme:finances-updated", handleSync);
      window.removeEventListener("remindme:notifications-updated", handleSync);
    };
  }, [router]);

  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [searchQuery, setSearchQuery] = useState("");

  // États des filtres multi-critères
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [filterActivityId, setFilterActivityId] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isCompletingAll, setIsCompletingAll] = useState(false);
  const [isReadingAll, setIsReadingAll] = useState(false);

  // État du modal de renouvellement rapide sans navigation inutile
  const [renewModal, setRenewModal] = useState<{
    notificationId: string;
    activityId: string;
    activityName: string;
    currentEndDate?: string;
  } | null>(null);
  const [renewEndDate, setRenewEndDate] = useState<string>("");
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  // Déduplication défensive pour garantir qu'aucun identifiant de notification n'apparaisse en double
  const uniqueNotifications = Array.from(
    new Map(notifications.map((n) => [n.id, n])).values()
  );

  // Liste combinée d'activités (props DB + métadonnées présentes dans les notifications)
  const availableActivities = useMemo(() => {
    const map = new Map<string, string>();
    if (activities && activities.length > 0) {
      for (const act of activities) {
        if (act.id && act.name) {
          map.set(act.id, act.name);
        }
      }
    }
    for (const n of notifications) {
      const actId =
        (n.metadata as any)?.activity_id ||
        (n.metadata as any)?.activityId ||
        (n.entity_type === "activity" ? n.entity_id : null);
      const actName =
        (n.metadata as any)?.activityName ||
        (n.metadata as any)?.activity_title ||
        (n.metadata as any)?.name;
      if (actId && actName && !map.has(actId)) {
        map.set(actId, actName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activities, notifications]);

  // Nombre de filtres actifs
  const activeFilterCount =
    (filterType !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterPeriod !== "all" ? 1 : 0) +
    (filterActivityId !== "all" ? 1 : 0) +
    (filterPriority !== "all" ? 1 : 0) +
    (searchQuery.trim().length > 0 ? 1 : 0);

  const handleResetFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setFilterPeriod("all");
    setCustomDateFrom("");
    setCustomDateTo("");
    setFilterActivityId("all");
    setFilterPriority("all");
    setSearchQuery("");
  };

  const activeCount = uniqueNotifications.filter(
    (n) => n.status !== "resolved" && n.status !== "dismissed" && n.status !== "actioned"
  ).length;

  const unreadCount = uniqueNotifications.filter(
    (n) =>
      !n.read_at &&
      n.status !== "read" &&
      n.status !== "resolved" &&
      n.status !== "dismissed" &&
      n.status !== "actioned"
  ).length;

  const resolvedCount = uniqueNotifications.filter(
    (n) => n.status === "resolved" || n.status === "dismissed" || n.status === "actioned"
  ).length;

  const filtered = uniqueNotifications
    .filter((n) => {
      const isResolved = n.status === "resolved" || n.status === "dismissed" || n.status === "actioned";
      const isUnread = !n.read_at && n.status !== "read" && !isResolved;
      const isTask = n.category === "task" || n.entity_type === "task";
      const isFinance =
        n.category === "payment" ||
        n.category === "expense" ||
        n.category === "scheduled_expense" ||
        n.category === "finance" ||
        n.entity_type === "income" ||
        n.entity_type === "expense" ||
        n.entity_type === "scheduled_expense";

      // 1. Filtrage par onglet (Tabs)
      if (activeTab === "active") {
        if (isResolved) return false;
      } else if (activeTab === "unread") {
        if (!isUnread) return false;
      } else if (activeTab === "tasks") {
        if ((!isTask && n.category !== "activity") || isResolved) return false;
      } else if (activeTab === "finances") {
        if (!isFinance || isResolved) return false;
      } else if (activeTab === "history") {
        if (!isResolved) return false;
      }

      // 2. Recherche textuelle (Titre + Corps)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchBody = n.body.toLowerCase().includes(q);
        if (!matchTitle && !matchBody) return false;
      }

      // 3. Filtre par Type
      if (filterType !== "all") {
        if (filterType === "activity") {
          const isAct =
            n.category === "activity" ||
            n.entity_type === "activity" ||
            Boolean(n.kind?.startsWith("activity_"));
          if (!isAct) return false;
        } else if (filterType === "session") {
          const isSession =
            Boolean(n.kind?.includes("session")) ||
            Boolean(n.kind?.includes("event")) ||
            n.entity_type === "calendar_event";
          if (!isSession) return false;
        } else if (filterType === "task") {
          if (!isTask) return false;
        } else if (filterType === "finance") {
          if (!isFinance) return false;
        } else if (filterType === "evolution") {
          const isEvol =
            n.kind === "activity_routine_suggestion" ||
            Boolean(n.kind?.includes("evolution"));
          if (!isEvol) return false;
        } else if (filterType === "expiration") {
          const isExp =
            n.kind === "activity_expired" ||
            n.kind === "activity_expiring_soon";
          if (!isExp) return false;
        }
      }

      // 4. Filtre par État
      if (filterStatus !== "all") {
        if (filterStatus === "unread") {
          if (!isUnread) return false;
        } else if (filterStatus === "read") {
          const isReadState = Boolean(n.read_at || n.status === "read") && !isResolved;
          if (!isReadState) return false;
        } else if (filterStatus === "action_pending") {
          if (!isNotificationActionable(n)) return false;
        } else if (filterStatus === "resolved") {
          const isResolvedOnly = n.status === "resolved" || n.status === "actioned";
          if (!isResolvedOnly) return false;
        } else if (filterStatus === "dismissed") {
          if (n.status !== "dismissed") return false;
        }
      }

      // 5. Filtre par Période (prise en compte de resolved_at pour les notifications résolues)
      if (filterPeriod !== "all") {
        const refDateIso = isResolved
          ? (n.resolved_at || n.actioned_at || n.created_at)
          : (n.scheduled_at || n.created_at);

        const itemDt = DateTime.fromISO(refDateIso, { zone: timezone });
        const nowDt = DateTime.now().setZone(timezone);

        if (filterPeriod === "today") {
          if (!itemDt.hasSame(nowDt, "day")) return false;
        } else if (filterPeriod === "7d") {
          const limitDt = nowDt.minus({ days: 7 }).startOf("day");
          if (itemDt < limitDt) return false;
        } else if (filterPeriod === "30d") {
          const limitDt = nowDt.minus({ days: 30 }).startOf("day");
          if (itemDt < limitDt) return false;
        } else if (filterPeriod === "custom") {
          if (customDateFrom) {
            const fromDt = DateTime.fromISO(customDateFrom, { zone: timezone }).startOf("day");
            if (itemDt < fromDt) return false;
          }
          if (customDateTo) {
            const toDt = DateTime.fromISO(customDateTo, { zone: timezone }).endOf("day");
            if (itemDt > toDt) return false;
          }
        }
      }

      // 6. Filtre par Activité concernée
      if (filterActivityId !== "all") {
        const notifActId =
          (n.metadata as any)?.activity_id ||
          (n.metadata as any)?.activityId ||
          (n.entity_type === "activity" ? n.entity_id : null);
        if (notifActId !== filterActivityId && n.entity_id !== filterActivityId) {
          return false;
        }
      }

      // 7. Filtre par Priorité
      if (filterPriority !== "all") {
        if (filterPriority === "critical") {
          if (n.priority !== "critical") return false;
        } else if (filterPriority === "high") {
          if (n.priority !== "high") return false;
        } else if (filterPriority === "action_required") {
          if (!isNotificationActionable(n)) return false;
        } else if (filterPriority === "normal") {
          if (n.priority !== "normal" && n.priority !== "low") return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const isResolvedA = a.status === "resolved" || a.status === "dismissed" || a.status === "actioned";
      const isResolvedB = b.status === "resolved" || b.status === "dismissed" || b.status === "actioned";

      // 1. Pour l'onglet historique, trier par date de résolution décroissante
      if (activeTab === "history") {
        const dateA = new Date(a.resolved_at || a.actioned_at || a.created_at).getTime();
        const dateB = new Date(b.resolved_at || b.actioned_at || b.created_at).getTime();
        return dateB - dateA;
      }

      // 2. Si onglet tout afficher (all), les non résolues en premier
      if (activeTab === "all" && isResolvedA !== isResolvedB) {
        return isResolvedA ? 1 : -1;
      }

      // 3. Hiérarchie stricte des priorités : critical (4) > high (3) > normal (2) > low (1)
      const priorityWeight = (p: string) => (p === "critical" ? 4 : p === "high" ? 3 : p === "normal" ? 2 : 1);
      const weightA = priorityWeight(a.priority);
      const weightB = priorityWeight(b.priority);
      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // 4. À priorité égale, mettre en avant les notifications nécessitant une action métier réelle
      const actionableA = isNotificationActionable(a);
      const actionableB = isNotificationActionable(b);
      if (actionableA !== actionableB) {
        return actionableA ? -1 : 1;
      }

      // 5. À priorité et actionnabilité égales, mettre les non lues en premier
      const isUnreadA = !a.read_at && a.status !== "read" && !isResolvedA;
      const isUnreadB = !b.read_at && b.status !== "read" && !isResolvedB;
      if (isUnreadA !== isUnreadB) {
        return isUnreadA ? -1 : 1;
      }

      // 6. Les plus récentes en premier (scheduled_at ou created_at DESC)
      const timeA = new Date(a.scheduled_at || a.created_at).getTime();
      const timeB = new Date(b.scheduled_at || b.created_at).getTime();
      return timeB - timeA;
    });

  const handleCompleteAll = async () => {
    if (isCompletingAll || activeCount === 0) return;
    setIsCompletingAll(true);

    const nowIso = new Date().toISOString();
    const previous = [...notifications];

    // Mise à jour optimiste locale instantanée
    setNotifications((prev) =>
      prev.map((n) =>
        n.status !== "resolved" && n.status !== "dismissed" && n.status !== "actioned"
          ? { ...n, read_at: n.read_at || nowIso, status: "resolved", resolved_at: nowIso }
          : n
      )
    );

    try {
      const res = await markAllNotificationsResolved();
      if (res && !res.success) {
        setNotifications(previous);
        showToast("Impossible de compléter les alertes. Veuillez réessayer.", "error");
      } else {
        showToast("Toutes les notifications actives ont été complétées.", "success");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("remindme:finances-updated"));
          window.dispatchEvent(new CustomEvent("remindme:notifications-updated"));
        }
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
      showToast("Erreur de connexion. Modifications annulées.", "error");
    } finally {
      setIsCompletingAll(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (isReadingAll || unreadCount === 0) return;
    setIsReadingAll(true);

    const nowIso = new Date().toISOString();
    const previous = [...notifications];

    // Mise à jour optimiste locale instantanée sur toutes les notifications non lues
    setNotifications((prev) =>
      prev.map((n) =>
        !n.read_at && n.status !== "read" && n.status !== "resolved" && n.status !== "dismissed"
          ? { ...n, read_at: nowIso, status: "read" }
          : n
      )
    );

    try {
      const res = await markAllNotificationsRead();
      if (!res?.success) {
        await fetch("/api/notifications/read-all", { method: "POST" });
      }
      showToast("Toutes les notifications ont été marquées comme lues.", "success");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      try {
        await fetch("/api/notifications/read-all", { method: "POST" });
        showToast("Toutes les notifications ont été marquées comme lues.", "success");
        startTransition(() => {
          router.refresh();
        });
      } catch {
        setNotifications(previous);
        showToast("Erreur de connexion. Veuillez réessayer.", "error");
      }
    } finally {
      setIsReadingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    const nowIso = new Date().toISOString();

    // 1. Mise à jour optimiste immédiate : le bouton Lu disparaît immédiatement (0ms)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: nowIso, status: "read" } : n
      )
    );

    try {
      const res = await markNotificationRead(id);
      if (!res?.success) {
        // Fallback API direct si le Server Action a échoué
        await fetch("/api/notifications/quick-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read", notificationId: id }),
        });
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      try {
        await fetch("/api/notifications/quick-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read", notificationId: id }),
        });
        startTransition(() => {
          router.refresh();
        });
      } catch {
        // Conserver l'état lu local pour ne pas réafficher le bouton Lu de manière intempestive
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolve = async (id: string, entityType?: string, entityId?: string) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    const nowIso = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id || (entityId && n.entity_id === entityId)) {
          return { ...n, status: "resolved", resolved_at: nowIso, read_at: nowIso };
        }
        return n;
      })
    );

    try {
      let res = await resolveNotification(id, entityType, entityId);
      if (res && !res.success) {
        // Fallback API direct si le Server Action échoue
        const actionMap: Record<string, string> = {
          income: "mark_received",
          payment: "mark_received",
          expense: "mark_paid",
          scheduled_expense: "mark_paid",
          task: "mark_task_done",
          activity: "mark_event_completed",
          calendar_event: "mark_event_completed",
        };
        const actionName = entityType ? actionMap[entityType] : null;
        if (actionName) {
          const apiRes = await fetch("/api/notifications/quick-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: actionName, notificationId: id, entityId }),
          });
          if (apiRes.ok) {
            res = { success: true };
          }
        }
      }

      if (res && !res.success) {
        setNotifications(previous);
        showToast(res.error || "Erreur lors de la validation.", "error");
      } else {
        showToast("Élément validé avec succès.", "success");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("remindme:finances-updated"));
          window.dispatchEvent(new CustomEvent("remindme:notifications-updated"));
        }
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
      showToast("Erreur réseau.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleTaskPostpone = async (id: string, entityId?: string, days: number = 1) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id || (entityId && n.entity_id === entityId)) {
          return { ...n, status: "snoozed", snoozed_until: snoozedUntil };
        }
        return n;
      })
    );

    try {
      let res = await postponeTaskAction(id, entityId || "", days);
      if (!res?.success) {
        const apiRes = await fetch("/api/notifications/quick-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "postpone_task", notificationId: id, entityId }),
        });
        if (!apiRes.ok) throw new Error("Échec");
      }
      showToast("Tâche reportée à demain.", "info");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setNotifications(previous);
      showToast("Erreur lors du report de la tâche.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleEventMissed = async (id: string, entityId?: string) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    const nowIso = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id || (entityId && n.entity_id === entityId)) {
          return { ...n, status: "resolved", resolved_at: nowIso, read_at: nowIso };
        }
        return n;
      })
    );

    try {
      let res = await markEventMissedAction(id, entityId || "");
      if (!res?.success) {
        const apiRes = await fetch("/api/notifications/quick-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_event_missed", notificationId: id, entityId }),
        });
        if (!apiRes.ok) throw new Error("Échec");
      }
      showToast("Séance enregistrée comme manquée.", "info");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setNotifications(previous);
      showToast("Erreur lors de l'enregistrement de la séance.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleEventPostpone = async (id: string, entityId?: string, hours: number = 2) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id || (entityId && n.entity_id === entityId)) {
          return { ...n, status: "snoozed", snoozed_until: snoozedUntil };
        }
        return n;
      })
    );

    try {
      let res = await postponeEventAction(id, entityId || "", hours);
      if (!res?.success) {
        const apiRes = await fetch("/api/notifications/quick-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "postpone_event", notificationId: id, entityId, hours }),
        });
        if (!apiRes.ok) throw new Error("Échec");
      }
      showToast(`Séance reportée de ${hours}h.`, "info");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setNotifications(previous);
      showToast("Erreur lors du report de la séance.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSnooze = async (id: string, hours: number = 24) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "snoozed", snoozed_until: snoozedUntil } : n))
    );

    try {
      const res = await snoozeNotification(id, hours);
      if (res && !res.success) {
        setNotifications(previous);
      } else {
        showToast(`Rappel reporté de ${hours}h.`, "info");
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const res = await deleteNotification(id);
      if (res && !res.success) {
        setNotifications(previous);
        showToast("Erreur lors de la suppression.", "error");
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
    } finally {
      setProcessingId(null);
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-danger-soft text-danger border border-danger/30 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger" />
            </span>
            {t("attention.critical")}
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 shrink-0">
            {t("attention.urgent")}
          </span>
        );
      case "normal":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 shrink-0">
            {t("attention.info")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-ink-100 dark:bg-ink-800 text-ink-500 shrink-0">
            Info
          </span>
        );
    }
  };

  const renderCategoryIcon = (category: string, kind: string, isResolved: boolean) => {
    let icon = <Bell className="w-4 h-4 text-ink-600 dark:text-ink-300" />;
    let bg = "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300";

    if (kind === "morning_briefing" || kind === "midday_checkin") {
      icon = <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      bg = "bg-amber-500/10 border border-amber-500/20";
    } else if (kind === "evening_checkin" || kind.includes("daily_summary")) {
      icon = <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      bg = "bg-indigo-500/10 border border-indigo-500/20";
    } else if (kind === "activity_routine_suggestion") {
      icon = <Sparkles className="w-4 h-4 text-signal" />;
      bg = "bg-signal-soft border border-signal/30";
    } else if (kind === "activity_expired" || kind === "activity_expiring_soon") {
      icon = <Clock className="w-4 h-4 text-warning" />;
      bg = "bg-warning-soft border border-warning/30";
    } else if (kind.includes("overdue") || kind.includes("conflict")) {
      icon = <AlertCircle className="w-4 h-4 text-danger" />;
      bg = "bg-danger-soft border border-danger/30";
    } else if (category === "payment" || kind.startsWith("payment_")) {
      icon = <Wallet className="w-4 h-4 text-positive" />;
      bg = "bg-positive-soft border border-positive/30";
    } else if (category === "expense" || category === "scheduled_expense" || kind.startsWith("expense_")) {
      icon = <Clock className="w-4 h-4 text-warning" />;
      bg = "bg-warning-soft border border-warning/30";
    } else if (category === "task") {
      icon = <CheckSquare className="w-4 h-4 text-signal" />;
      bg = "bg-signal-soft border border-signal/30";
    } else if (category === "activity" || category === "calendar") {
      icon = <Briefcase className="w-4 h-4 text-signal" />;
      bg = "bg-signal-soft border border-signal/30";
    }

    if (isResolved) {
      bg = "bg-ink-100 dark:bg-ink-800 text-ink-400 opacity-60";
    }

    return (
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${bg}`}>
        {icon}
      </div>
    );
  };

  const isAnyActionPending = isCompletingAll || isReadingAll;

  return (
    <div className="relative isolate min-h-full w-full space-y-5 min-w-0 max-w-full">

      {/* Header with Title and Global Actions */}
      <div className="rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800/80 p-5 sm:p-6 shadow-xs" data-tour="notifications-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-signal/15 text-signal inline-flex shrink-0 mt-0.5">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white truncate">
                  {t("nav.notifications")}
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-danger text-white text-[11px] font-bold animate-pulse shrink-0">
                    {unreadCount} {t("actions.filter_unread")}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-ink-500 mt-1">
                {activeCount > 0
                  ? `${activeCount} élément${activeCount > 1 ? "s" : ""} nécessite${activeCount > 1 ? "nt" : ""} votre attention ou une action rapide.`
                  : "Votre centre de notifications est parfaitement à jour."}
              </p>
            </div>
          </div>

          {/* Boutons d'Action Globale */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <SectionGuideTrigger section="notifications" label="Guide des notifications" />
            <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto">
              {/* Bouton Tout compléter */}
              <button
                type="button"
                disabled={isAnyActionPending || activeCount === 0}
                onClick={handleCompleteAll}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-signal text-white text-xs font-bold hover:bg-signal-dark active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none tap-active cursor-pointer min-h-[40px]"
                title="Marquer toutes les notifications actives comme traitées"
              >
                {isCompletingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="truncate">Traitement...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Tout compléter</span>
                  </>
                )}
              </button>

              {/* Bouton Tout marquer comme lu */}
              <button
                type="button"
                disabled={isAnyActionPending || unreadCount === 0}
                onClick={handleMarkAllRead}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-canvas dark:bg-ink-900 border border-ink-300 dark:border-ink-700 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none tap-active cursor-pointer min-h-[40px]"
                title="Marquer toutes les notifications comme lues"
              >
                {isReadingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="truncate">Traitement...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline truncate">{t("actions.mark_all_read")}</span>
                    <span className="sm:hidden truncate">Tout lire</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0" data-tour="notifications-tabs">
        <div className="w-full sm:w-auto overflow-x-auto no-scrollbar pb-0.5">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-100/80 dark:bg-ink-900/80 border border-ink-200/80 dark:border-ink-800/80 min-w-max">
            {[
              { key: "active", label: t("actions.filter_active"), count: activeCount },
              { key: "unread", label: t("actions.filter_unread"), count: unreadCount },
              {
                key: "finances",
                label: t("actions.filter_finances"),
                count: notifications.filter(
                  (n) =>
                    (n.category === "payment" ||
                      n.category === "expense" ||
                      n.entity_type === "income" ||
                      n.entity_type === "expense" ||
                      n.entity_type === "scheduled_expense") &&
                    n.status !== "resolved" &&
                    n.status !== "dismissed" &&
                    n.status !== "actioned"
                ).length,
              },
              {
                key: "tasks",
                label: t("actions.filter_tasks"),
                count: notifications.filter(
                  (n) =>
                    (n.category === "task" || n.category === "activity" || n.entity_type === "task") &&
                    n.status !== "resolved" &&
                    n.status !== "dismissed" &&
                    n.status !== "actioned"
                ).length,
              },
              { key: "history", label: t("actions.filter_history"), count: resolvedCount },
              { key: "all", label: t("actions.filter_all"), count: notifications.length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap flex items-center gap-1.5 tap-active cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-canvas-raised dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs font-bold"
                    : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white font-medium"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === tab.key ? "bg-signal text-white" : "bg-ink-200 dark:bg-ink-700 text-ink-700 dark:text-ink-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter Trigger */}
        <div className="flex items-center gap-2 w-full sm:w-auto" data-tour="notifications-filters">
          <div className="relative flex-1 sm:w-64 min-w-0">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={t("actions.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-canvas-raised dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-signal min-h-[38px]"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-ink-400 hover:text-ink-700 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFiltersPanel((prev) => !prev)}
            aria-label="Afficher ou masquer les filtres multi-critères"
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all tap-active cursor-pointer min-h-[38px] shrink-0 ${
              showFiltersPanel || activeFilterCount > 0
                ? "bg-signal-soft text-signal border-signal/40 font-bold shadow-2xs"
                : "bg-canvas-raised dark:bg-ink-900 border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:border-ink-300 dark:hover:border-ink-600"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtres</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-signal text-white font-bold text-[10px]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Multi-Criteria Filters Panel */}
      {showFiltersPanel && (
        <div className="rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800/80 p-4 shadow-xs space-y-3 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-signal" />
              <span className="text-xs font-bold text-ink-950 dark:text-white uppercase tracking-wider">
                Filtres multi-critères
              </span>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-ink-500 hover:text-danger inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>

          {/* Grid of 5 filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* 1. Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider block">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal min-h-[36px] cursor-pointer"
              >
                <option value="all">Tous les types</option>
                <option value="activity">Activités</option>
                <option value="session">Séances</option>
                <option value="task">Tâches</option>
                <option value="finance">Finances</option>
                <option value="evolution">Suggestions d&apos;évolution</option>
                <option value="expiration">Expirations</option>
              </select>
            </div>

            {/* 2. État */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider block">
                État
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal min-h-[36px] cursor-pointer"
              >
                <option value="all">Tous les états</option>
                <option value="unread">Non lue</option>
                <option value="read">Lue</option>
                <option value="action_pending">En attente d&apos;action</option>
                <option value="resolved">Résolue</option>
                <option value="dismissed">Écartée</option>
              </select>
            </div>

            {/* 3. Période */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider block">
                Période
              </label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as FilterPeriod)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal min-h-[36px] cursor-pointer"
              >
                <option value="all">Toute période</option>
                <option value="today">Aujourd&apos;hui</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="custom">Période personnalisée...</option>
              </select>
            </div>

            {/* 4. Activité concernée */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider block">
                Activité concernée
              </label>
              <select
                value={filterActivityId}
                onChange={(e) => setFilterActivityId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal min-h-[36px] cursor-pointer"
              >
                <option value="all">Toutes les activités</option>
                {availableActivities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Priorité */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider block">
                Priorité
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal min-h-[36px] cursor-pointer"
              >
                <option value="all">Toutes les priorités</option>
                <option value="critical">Critique</option>
                <option value="high">Urgente</option>
                <option value="action_required">Action requise</option>
                <option value="normal">Normale</option>
              </select>
            </div>
          </div>

          {/* Dates personnalisées si filtre 'custom' */}
          {filterPeriod === "custom" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 border-t border-ink-100 dark:border-ink-800/80">
              <span className="text-xs text-ink-500 font-medium shrink-0">Plage de dates :</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal min-h-[36px]"
                  placeholder="Du"
                  aria-label="Date de début"
                />
                <span className="text-xs text-ink-400">à</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal min-h-[36px]"
                  placeholder="Au"
                  aria-label="Date de fin"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active criteria summary & Results Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-ink-600 dark:text-ink-400 font-semibold">
            {filtered.length} notification{filtered.length > 1 ? "s" : ""}
            {activeFilterCount > 0 && " trouvée" + (filtered.length > 1 ? "s" : "")}
          </span>

          {/* Active criteria pills */}
          {filterType !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 font-medium">
              Type : {filterType === "activity" ? "Activités" : filterType === "session" ? "Séances" : filterType === "task" ? "Tâches" : filterType === "finance" ? "Finances" : filterType === "evolution" ? "Évolution" : "Expirations"}
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className="hover:text-danger p-0.5 cursor-pointer"
                aria-label="Supprimer le filtre type"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterStatus !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 font-medium">
              État : {filterStatus === "unread" ? "Non lue" : filterStatus === "read" ? "Lue" : filterStatus === "action_pending" ? "En attente d'action" : filterStatus === "resolved" ? "Résolue" : "Écartée"}
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className="hover:text-danger p-0.5 cursor-pointer"
                aria-label="Supprimer le filtre état"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterPeriod !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 font-medium">
              Période : {filterPeriod === "today" ? "Aujourd'hui" : filterPeriod === "7d" ? "7 derniers jours" : filterPeriod === "30d" ? "30 derniers jours" : "Personnalisée"}
              <button
                type="button"
                onClick={() => {
                  setFilterPeriod("all");
                  setCustomDateFrom("");
                  setCustomDateTo("");
                }}
                className="hover:text-danger p-0.5 cursor-pointer"
                aria-label="Supprimer le filtre période"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterActivityId !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 font-medium">
              Activité : {availableActivities.find((a) => a.id === filterActivityId)?.name || filterActivityId}
              <button
                type="button"
                onClick={() => setFilterActivityId("all")}
                className="hover:text-danger p-0.5 cursor-pointer"
                aria-label="Supprimer le filtre activité"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterPriority !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 font-medium">
              Priorité : {filterPriority === "critical" ? "Critique" : filterPriority === "high" ? "Urgente" : filterPriority === "action_required" ? "Action requise" : "Normale"}
              <button
                type="button"
                onClick={() => setFilterPriority("all")}
                className="hover:text-danger p-0.5 cursor-pointer"
                aria-label="Supprimer le filtre priorité"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 font-medium">
              « {searchQuery.trim()} »
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="hover:text-danger p-0.5 cursor-pointer"
                aria-label="Supprimer la recherche"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-signal font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer tap-active shrink-0 ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Effacer tous les filtres</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div data-tour="notifications-list" className="w-full">
      {filtered.length === 0 ? (
        activeFilterCount > 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 p-10 sm:p-14 text-center bg-canvas-raised/60 dark:bg-ink-900/60 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shadow-2xs">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-ink-950 dark:text-white">
              Aucun résultat correspondant
            </h3>
            <p className="text-xs sm:text-sm text-ink-500 max-w-sm mt-1 leading-relaxed">
              Aucune notification ne correspond à la combinaison de vos critères de recherche actuels.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-signal text-white text-xs font-bold hover:bg-signal-dark active:scale-95 transition-all shadow-2xs tap-active cursor-pointer min-h-[38px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 p-12 sm:p-16 text-center bg-canvas-raised/60 dark:bg-ink-900/60 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-positive-soft text-positive flex items-center justify-center mb-3.5 shadow-2xs">
              <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-ink-950 dark:text-white">
              {t("actions.empty_title")}
            </h3>
            <p className="text-xs sm:text-sm text-ink-500 max-w-sm mt-1 leading-relaxed">
              {t("actions.empty_desc")}
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isResolved = item.status === "resolved" || item.status === "dismissed" || item.status === "actioned";
            const isUnread = !item.read_at && item.status !== "read" && !isResolved;
            const isSnoozed = item.status === "snoozed";
            const isThisBusy = processingId === item.id;
            const isIncome = item.category === "payment" || item.entity_type === "income";
            const isExpense = item.category === "expense" || item.entity_type === "expense";
            const isTask = item.category === "task" || item.entity_type === "task";
            const isActivityOrEvent =
              item.category === "activity" ||
              item.entity_type === "activity" ||
              item.kind.includes("activity");
            const isScheduledExpense = item.entity_type === "scheduled_expense";
            const isDailySummary =
              item.entity_type === "daily_summary" ||
              item.kind === "evening_checkin" ||
              Boolean((item as any).metadata?.is_daily_summary);
            const isInformative =
              Boolean((item as any).metadata?.is_informative) ||
              item.kind.includes("activity_upcoming");
            const isDay = isDayTime(item.scheduled_at || item.created_at, timezone);
            const hasAction = !isResolved && (
              item.kind === "activity_routine_suggestion" ||
              item.kind === "activity_expired" ||
              item.kind === "activity_expiring_soon" ||
              isDailySummary ||
              Boolean(isTask && item.entity_id) ||
              Boolean(isIncome && item.entity_id) ||
              Boolean((isExpense || isScheduledExpense) && item.entity_id) ||
              Boolean(isActivityOrEvent && item.entity_id && item.kind !== "activity_routine_suggestion" && item.kind !== "activity_expired" && item.kind !== "activity_expiring_soon")
            );

            // Left-edge indicator for visual hierarchy without loud background fills
            const cardBorderClass = isResolved
              ? "border border-ink-200/50 dark:border-ink-800/50 bg-canvas-raised/40 dark:bg-ink-900/40 opacity-65"
              : item.priority === "critical"
              ? "border border-ink-200/90 dark:border-ink-800/90 border-l-[3.5px] border-l-danger bg-canvas-raised dark:bg-ink-900 shadow-2xs hover:border-ink-300 dark:hover:border-ink-700"
              : item.priority === "high"
              ? "border border-ink-200/90 dark:border-ink-800/90 border-l-[3.5px] border-l-amber-500 bg-canvas-raised dark:bg-ink-900 shadow-2xs hover:border-ink-300 dark:hover:border-ink-700"
              : isUnread
              ? "border border-ink-200/90 dark:border-ink-800/90 border-l-[3.5px] border-l-signal bg-canvas-raised dark:bg-ink-900 shadow-2xs hover:border-ink-300 dark:hover:border-ink-700"
              : "border border-ink-200/80 dark:border-ink-800/80 bg-canvas-raised dark:bg-ink-900 hover:border-ink-300 dark:hover:border-ink-700";

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isUnread) {
                    handleMarkRead(item.id);
                  }
                }}
                className={`p-4 rounded-xl transition-all duration-150 w-full min-w-0 ${
                  isUnread ? "cursor-pointer" : ""
                } ${cardBorderClass}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 min-w-0">
                  {/* Left: Icon & Content */}
                  <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                    {renderCategoryIcon(item.category, item.kind, isResolved)}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Indicateur Jour / Nuit */}
                        <span 
                          className="inline-flex items-center text-xs text-ink-400 shrink-0 select-none" 
                          title={isDay ? "Jour (06:00 - 17:59)" : "Nuit (18:00 - 05:59)"}
                        >
                          {isDay ? "☀️" : "🌙"}
                        </span>

                        {getPriorityBadge(item.priority)}

                        {hasAction && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-signal/15 text-signal border border-signal/30 shrink-0">
                            Action requise
                          </span>
                        )}

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-signal shrink-0 ring-4 ring-signal/15" title="Non lu" />
                        )}

                        {item.status === "resolved" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-positive-soft text-positive inline-flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> Terminé
                          </span>
                        )}
                        {item.status === "actioned" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-signal-soft text-signal inline-flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> Traité
                          </span>
                        )}
                        {item.status === "dismissed" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 inline-flex items-center gap-1 shrink-0">
                            <X className="w-3 h-3" /> Écarté
                          </span>
                        )}
                        {isSnoozed && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-warning-soft text-warning inline-flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" /> {t("actions.snooze")}
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm sm:text-base font-bold tracking-tight break-words ${
                          isResolved ? "line-through text-ink-400 dark:text-ink-500" : "text-ink-950 dark:text-white"
                        }`}
                      >
                        {item.title}
                      </h4>

                      <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed break-words">
                        {item.body}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-400 pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {DateTime.fromISO(item.created_at, { zone: timezone })
                            .setLocale(locale)
                            .toRelative()}
                        </span>
                        {item.link && (
                          <>
                            <span>•</span>
                            <Link
                              href={item.link}
                              onClick={() => {
                                if (isUnread) {
                                  handleMarkRead(item.id);
                                }
                              }}
                              className="font-medium text-signal hover:underline inline-flex items-center gap-1 tap-active"
                            >
                              {t("actions.view_item")} <ArrowRight className="w-3 h-3" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-ink-100 dark:border-ink-800/80 flex-wrap sm:flex-nowrap w-full sm:w-auto"
                  >
                    {/* Primary & Contextual Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Suggestion d'évolution vers une routine */}
                      {!isResolved && item.kind === "activity_routine_suggestion" && (
                        <>
                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (processingId) return;
                              setProcessingId(item.id);
                              const previous = [...notifications];
                              const nowIso = new Date().toISOString();
                              setNotifications((prev) =>
                                prev.map((n) => (n.id === item.id ? { ...n, status: "actioned", actioned_at: nowIso, resolved_at: nowIso } : n))
                              );
                              try {
                                let res = await acceptEvolutionAction(item.entity_id || "", item.id);
                                if (!res?.success) {
                                  const apiRes = await fetch("/api/notifications/quick-action", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      action: "accept_evolution",
                                      notificationId: item.id,
                                      entityId: item.entity_id,
                                    }),
                                  });
                                  if (!apiRes.ok) throw new Error("Échec");
                                }
                                showToast("Activité passée en routine avec succès !", "success");
                                startTransition(() => {
                                  router.refresh();
                                });
                              } catch {
                                setNotifications(previous);
                                showToast("Erreur lors du passage en routine.", "error");
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-signal hover:bg-signal-dark text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                            title="Accepter l'évolution vers une routine"
                            aria-label="Passer cette activité en routine"
                          >
                            {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>Passer en routine</span>
                          </button>

                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (processingId) return;
                              setProcessingId(item.id);
                              const previous = [...notifications];
                              const nowIso = new Date().toISOString();
                              setNotifications((prev) =>
                                prev.map((n) => (n.id === item.id ? { ...n, status: "dismissed", resolved_at: nowIso } : n))
                              );
                              try {
                                let res = await declineEvolutionAction(item.entity_id || "", item.id);
                                if (!res?.success) {
                                  const apiRes = await fetch("/api/notifications/quick-action", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      action: "decline_evolution",
                                      notificationId: item.id,
                                      entityId: item.entity_id,
                                    }),
                                  });
                                  if (!apiRes.ok) throw new Error("Échec");
                                }
                                showToast("Choix respecté : configuration actuelle conservée.", "success");
                                startTransition(() => {
                                  router.refresh();
                                });
                              } catch {
                                setNotifications(previous);
                                showToast("Erreur lors de l'enregistrement de votre choix.", "error");
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            className="px-3 py-2 rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-800 text-ink-700 dark:text-ink-300 text-xs font-semibold hover:bg-ink-100 dark:hover:bg-ink-700 active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1 cursor-pointer min-h-[38px]"
                            title="Conserver la configuration actuelle (répit 30 jours)"
                            aria-label="Garder la configuration actuelle"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Garder actuel</span>
                          </button>
                        </>
                      )}

                      {/* Actions de renouvellement d'activité expirée */}
                      {!isResolved && (item.kind === "activity_expired" || item.kind === "activity_expiring_soon") && (
                        <>
                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentEnd = (item as any).metadata?.endDate;
                              const defaultNextMonth = DateTime.now().setZone(timezone).plus({ months: 1 }).toISODate()!;
                              setRenewEndDate(defaultNextMonth);
                              setRenewModal({
                                notificationId: item.id,
                                activityId: item.entity_id || "",
                                activityName: (item as any).metadata?.name || item.title,
                                currentEndDate: currentEnd,
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-signal hover:bg-signal-dark text-white text-xs font-bold active:scale-95 transition-all shadow-2xs tap-active flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                            title="Prolonger ou renouveler l'activité immédiatement"
                            aria-label="Renouveler l'activité"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Renouveler</span>
                          </button>

                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (processingId) return;
                              setProcessingId(item.id);
                              const previous = [...notifications];
                              const nowIso = new Date().toISOString();
                              setNotifications((prev) =>
                                prev.map((n) => (n.id === item.id ? { ...n, status: "dismissed", resolved_at: nowIso } : n))
                              );
                              try {
                                let res = await keepExpiredAction(item.entity_id || "", item.id);
                                if (!res?.success) {
                                  const apiRes = await fetch("/api/notifications/quick-action", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      action: "keep_expired",
                                      notificationId: item.id,
                                      entityId: item.entity_id,
                                    }),
                                  });
                                  if (!apiRes.ok) throw new Error("Échec");
                                }
                                showToast("Activité maintenue expirée sans renouvellement.", "info");
                                startTransition(() => {
                                  router.refresh();
                                });
                              } catch {
                                setNotifications(previous);
                                showToast("Erreur lors de l'enregistrement de votre choix.", "error");
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            className="px-3 py-2 rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-800 text-ink-700 dark:text-ink-300 text-xs font-semibold hover:bg-ink-100 dark:hover:bg-ink-700 active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1 cursor-pointer min-h-[38px]"
                            title="Conserver l'activité expirée sans renouvellement"
                            aria-label="Laisser l'activité expirée"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Laisser expirée</span>
                          </button>
                        </>
                      )}

                      {/* Clôture de journée */}
                      {!isResolved && isDailySummary && (
                        <button
                          type="button"
                          disabled={isThisBusy}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (processingId) return;
                            setProcessingId(item.id);
                            const previous = [...notifications];
                            const nowIso = new Date().toISOString();
                            setNotifications((prev) =>
                              prev.map((n) => (n.id === item.id ? { ...n, status: "resolved", resolved_at: nowIso } : n))
                            );
                            try {
                              const summaryDate = (item as any).metadata?.date || nowIso.split("T")[0];
                              const res = await validateDailySummaryAction(summaryDate, item.id);
                              if (res && !res.success) {
                                setNotifications(previous);
                                showToast("Erreur lors de la validation du bilan.", "error");
                              } else {
                                showToast("Bilan de la journée validé avec succès !", "success");
                                startTransition(() => {
                                  router.refresh();
                                });
                              }
                            } catch {
                              setNotifications(previous);
                              showToast("Erreur réseau.", "error");
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                          title="Valider et clôturer le bilan de la journée"
                          aria-label="Clôturer la journée"
                        >
                          {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Clôturer la journée</span>
                        </button>
                      )}

                      {/* Tâche */}
                      {!isResolved && isTask && item.entity_id && (
                        <>
                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(item.id, "task", item.entity_id);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-positive text-white text-xs font-bold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                            title={t("actions.mark_done")}
                            aria-label={t("actions.mark_done")}
                          >
                            {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>{t("actions.mark_done")}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskPostpone(item.id, item.entity_id, 1);
                            }}
                            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/30 active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1 cursor-pointer min-h-[38px]"
                            title="Reporter la tâche à demain"
                            aria-label="Reporter la tâche à demain"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Reporter</span>
                          </button>
                        </>
                      )}

                      {/* Encaissement */}
                      {!isResolved && isIncome && item.entity_id && (
                        <button
                          type="button"
                          disabled={isThisBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolve(item.id, "income", item.entity_id);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-positive text-white text-xs font-bold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                          title={t("actions.mark_received")}
                          aria-label={t("actions.mark_received")}
                        >
                          {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>{t("actions.mark_received")}</span>
                        </button>
                      )}

                      {/* Dépense & Échéance financière */}
                      {!isResolved && (isExpense || isScheduledExpense) && item.entity_id && (
                        <button
                          type="button"
                          disabled={isThisBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolve(
                              item.id,
                              isScheduledExpense ? "scheduled_expense" : "expense",
                              item.entity_id
                            );
                          }}
                          className="px-3.5 py-2 rounded-xl bg-signal text-white text-xs font-bold hover:bg-signal-dark active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                          title={t("actions.mark_paid")}
                          aria-label={t("actions.mark_paid")}
                        >
                          {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>{t("actions.mark_paid")}</span>
                        </button>
                      )}

                      {/* Séance d'activité */}
                      {!isResolved && isActivityOrEvent && !isInformative && item.entity_id && (
                        <>
                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(item.id, "activity", item.entity_id);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-positive text-white text-xs font-bold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                            title={t("actions.mark_completed")}
                            aria-label={t("actions.mark_completed")}
                          >
                            {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>{t("actions.mark_completed")}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventMissed(item.id, item.entity_id);
                            }}
                            className="px-2.5 py-2 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger text-xs font-semibold border border-danger/30 active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1 cursor-pointer min-h-[38px]"
                            title="Signaler la séance comme manquée"
                            aria-label="Signaler comme manquée"
                          >
                            {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            <span>Manquée</span>
                          </button>

                          <button
                            type="button"
                            disabled={isThisBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventPostpone(item.id, item.entity_id, 2);
                            }}
                            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/30 active:scale-95 transition-all disabled:opacity-50 shadow-2xs tap-active flex items-center gap-1 cursor-pointer min-h-[38px]"
                            title="Reporter la séance de 2 heures"
                            aria-label="Reporter la séance de 2 heures"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Reporter</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Secondary Utility Actions */}
                    <div className="flex items-center gap-1 ml-auto sm:ml-0">
                      {isUnread && !isDailySummary && (
                        <button
                          type="button"
                          disabled={isThisBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(item.id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all tap-active cursor-pointer min-h-[36px]"
                          title="Marquer comme lu"
                          aria-label="Marquer comme lu"
                        >
                          {locale === "fr" ? "Lu" : "Read"}
                        </button>
                      )}

                      {!isResolved && !isSnoozed && (
                        <button
                          type="button"
                          disabled={isThisBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSnooze(item.id, 24);
                          }}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium text-ink-500 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all tap-active flex items-center gap-1 cursor-pointer min-h-[36px]"
                          title="Reporter de 24 heures"
                          aria-label="Reporter de 24 heures"
                        >
                          <Clock className="w-3 h-3" /> +24h
                        </button>
                      )}

                      {/* Bouton de lecture vocale instantanée */}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (playingId === item.id) {
                            stopVoiceReminder();
                            setPlayingId(null);
                            return;
                          }
                          setPlayingId(item.id);
                          const prefs = getLocalVoiceSettings();
                          const textToSpeak = (item as any).metadata?.voice_text || `${item.title}. ${item.body}`;
                          await playVoiceReminder({
                            text: textToSpeak,
                            language: prefs.voice_language,
                            voiceType: prefs.voice_type,
                            repeat: 0,
                            rate: prefs.voice_playback_rate || 1.0,
                            onEnd: () => setPlayingId(null),
                            onError: () => setPlayingId(null),
                          });
                        }}
                        className={`p-2 rounded-lg active:scale-95 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                          playingId === item.id
                            ? "bg-signal text-white shadow-2xs"
                            : "text-ink-500 dark:text-ink-400 hover:text-signal dark:hover:text-signal hover:bg-signal-soft/30"
                        }`}
                        title={playingId === item.id ? "Arrêter la lecture" : "Écouter ce rappel à voix haute"}
                        aria-label={playingId === item.id ? "Arrêter la lecture vocale" : "Écouter ce rappel à voix haute"}
                      >
                        {playingId === item.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-2 rounded-lg text-ink-400 hover:text-danger hover:bg-danger-soft/20 active:scale-95 transition-all tap-active inline-flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px]"
                        title={t("actions.delete")}
                        aria-label={t("actions.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Modal de renouvellement rapide in-place sans navigation inutile */}
      {renewModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !renewSubmitting && setRenewModal(null)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/90 dark:border-ink-800/90 p-5 sm:p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-signal-soft text-signal border border-signal/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-ink-950 dark:text-white">
                    Renouveler l&apos;activité
                  </h3>
                  <p className="text-xs text-ink-500 truncate max-w-xs">
                    « {renewModal.activityName} »
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={renewSubmitting}
                onClick={() => setRenewModal(null)}
                aria-label="Fermer la boîte de dialogue"
                className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renewModal.currentEndDate && (
              <div className="p-2.5 rounded-xl bg-ink-100/70 dark:bg-ink-800/70 border border-ink-200/50 dark:border-ink-700/50 text-xs text-ink-600 dark:text-ink-300">
                Échéance précédente : <span className="font-semibold text-ink-950 dark:text-white">{formatDateLocale(renewModal.currentEndDate, locale, timezone)}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-300 block">
                Nouvelle date d&apos;échéance
              </label>

              {/* Raccourcis de durée */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "+1 mois", months: 1 },
                  { label: "+3 mois", months: 3 },
                  { label: "+6 mois", months: 6 },
                  { label: "+1 an", months: 12 },
                ].map((preset) => {
                  const targetDate = DateTime.now().setZone(timezone).plus({ months: preset.months }).toISODate()!;
                  const isSelected = renewEndDate === targetDate;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={renewSubmitting}
                      onClick={() => setRenewEndDate(targetDate)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center tap-active cursor-pointer min-h-[36px] ${
                        isSelected
                          ? "bg-signal text-white border-signal shadow-2xs font-bold"
                          : "bg-canvas dark:bg-ink-800 border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:border-signal/50"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Sélecteur de date précis */}
              <input
                type="date"
                value={renewEndDate}
                min={DateTime.now().setZone(timezone).toISODate()!}
                onChange={(e) => setRenewEndDate(e.target.value)}
                disabled={renewSubmitting}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal min-h-[38px]"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-ink-100 dark:border-ink-800">
              <Link
                href={`/activities?renew=${renewModal.activityId}`}
                onClick={() => setRenewModal(null)}
                className="text-xs font-medium text-signal hover:underline inline-flex items-center gap-1 tap-active"
              >
                Édition complète <ArrowRight className="w-3 h-3" />
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={renewSubmitting}
                  onClick={() => setRenewModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer min-h-[38px]"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={renewSubmitting || !renewEndDate}
                  onClick={async () => {
                    if (renewSubmitting || !renewEndDate || !renewModal) return;
                    setRenewSubmitting(true);
                    const previous = [...notifications];
                    const nowIso = new Date().toISOString();

                    // Optimistic update
                    setNotifications((prev) =>
                      prev.map((n) =>
                        n.id === renewModal.notificationId || n.entity_id === renewModal.activityId
                          ? { ...n, status: "resolved", resolved_at: nowIso, read_at: nowIso }
                          : n
                      )
                    );

                    try {
                      let res = await quickRenewActivityAction(
                        renewModal.activityId,
                        renewEndDate,
                        renewModal.notificationId
                      );

                      if (!res?.success) {
                        const apiRes = await fetch("/api/notifications/quick-action", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "renew_activity",
                            entityId: renewModal.activityId,
                            notificationId: renewModal.notificationId,
                            endDate: renewEndDate,
                          }),
                        });
                        if (!apiRes.ok) throw new Error("Échec du renouvellement");
                      }

                      showToast(`Activité renouvelée avec succès jusqu'au ${formatDateLocale(renewEndDate, locale, timezone)} !`, "success");
                      setRenewModal(null);
                      startTransition(() => {
                        router.refresh();
                      });
                    } catch {
                      setNotifications(previous);
                      showToast("Erreur lors du renouvellement de l'activité.", "error");
                    } finally {
                      setRenewSubmitting(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-signal hover:bg-signal-dark text-white text-xs font-bold active:scale-95 transition-all shadow-2xs tap-active flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[38px]"
                >
                  {renewSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Renouvellement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Valider</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
