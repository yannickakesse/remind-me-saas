"use client";

import { PageBackground } from "@/components/shared/page-background";
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
  MoreHorizontal,
  ChevronDown,
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
  const { locale, t , tr } = useLanguage();
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
        showToast(tr("Impossible de compléter les alertes. Veuillez réessayer."), "error");
      } else {
        showToast(tr("Toutes les notifications actives ont été complétées."), "success");
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
      showToast(tr("Erreur de connexion. Modifications annulées."), "error");
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
      showToast(tr("Toutes les notifications ont été marquées comme lues."), "success");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      try {
        await fetch("/api/notifications/read-all", { method: "POST" });
        showToast(tr("Toutes les notifications ont été marquées comme lues."), "success");
        startTransition(() => {
          router.refresh();
        });
      } catch {
        setNotifications(previous);
        showToast(tr("Erreur de connexion. Veuillez réessayer."), "error");
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
        showToast(tr("Élément validé avec succès."), "success");
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
      showToast(tr("Erreur réseau."), "error");
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
      showToast(tr("Tâche reportée à demain."), "info");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setNotifications(previous);
      showToast(tr("Erreur lors du report de la tâche."), "error");
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
      showToast(tr("Séance enregistrée comme manquée."), "info");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setNotifications(previous);
      showToast(tr("Erreur lors de l'enregistrement de la séance."), "error");
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
      showToast(tr("Erreur lors du report de la séance."), "error");
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
        showToast(tr("Erreur lors de la suppression."), "error");
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
            {tr("Info")}</span>
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

  // ── Actions contextuelles (extraites pour l'affichage compact : 1 action principale + menu « ⋯ ») ──
  const runQuickAction = async (
    item: Notification,
    nextStatus: "actioned" | "dismissed" | "resolved",
    serverAction: () => Promise<any>,
    fallbackAction: string | null,
    successMessage: string,
    errorMessage: string,
    toastKind: "success" | "info" = "success"
  ) => {
    if (processingId) return;
    setProcessingId(item.id);
    setOpenMenuId(null);
    const previous = [...notifications];
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === item.id
          ? { ...n, status: nextStatus, resolved_at: nowIso, ...(nextStatus === "actioned" ? { actioned_at: nowIso } : {}) }
          : n
      )
    );
    try {
      const res = await serverAction();
      if (!res?.success && fallbackAction) {
        const apiRes = await fetch("/api/notifications/quick-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: fallbackAction, notificationId: item.id, entityId: item.entity_id }),
        });
        if (!apiRes.ok) throw new Error("Échec");
      } else if (res && res.success === false) {
        throw new Error("Échec");
      }
      showToast(successMessage, toastKind);
      startTransition(() => router.refresh());
    } catch {
      setNotifications(previous);
      showToast(errorMessage, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const openRenewModal = (item: Notification) => {
    setOpenMenuId(null);
    setRenewEndDate(DateTime.now().setZone(timezone).plus({ months: 1 }).toISODate()!);
    setRenewModal({
      notificationId: item.id,
      activityId: item.entity_id || "",
      activityName: (item as any).metadata?.name || item.title,
      currentEndDate: (item as any).metadata?.endDate,
    });
  };

  const handleSpeak = async (item: Notification) => {
    setOpenMenuId(null);
    if (playingId === item.id) {
      stopVoiceReminder();
      setPlayingId(null);
      return;
    }
    setPlayingId(item.id);
    const prefs = getLocalVoiceSettings();
    await playVoiceReminder({
      text: (item as any).metadata?.voice_text || `${item.title}. ${item.body}`,
      language: prefs.voice_language,
      voiceType: prefs.voice_type,
      repeat: 0,
      rate: prefs.voice_playback_rate || 1.0,
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null),
    });
  };

  type RowAction = { label: string; icon: React.ElementType; onClick: () => void; tone?: "primary" | "positive" | "danger" };

  /** Classe la notification et renvoie son action principale + ses actions secondaires. */
  const describe = (item: Notification) => {
    const isResolved = item.status === "resolved" || item.status === "dismissed" || item.status === "actioned";
    const isUnread = !item.read_at && item.status !== "read" && !isResolved;
    const isIncome = item.category === "payment" || item.entity_type === "income";
    const isExpense = item.category === "expense" || item.entity_type === "expense";
    const isScheduledExpense = item.entity_type === "scheduled_expense";
    const isTask = item.category === "task" || item.entity_type === "task";
    const isActivityOrEvent =
      item.category === "activity" || item.entity_type === "activity" || item.kind.includes("activity");
    const isDailySummary =
      item.entity_type === "daily_summary" ||
      item.kind === "evening_checkin" ||
      Boolean((item as any).metadata?.is_daily_summary);
    const isInformative =
      Boolean((item as any).metadata?.is_informative) || item.kind.includes("activity_upcoming");

    let primary: RowAction | null = null;
    const secondary: RowAction[] = [];
    let group: "income" | "expense" | "task" | "activity" | "other" = "other";

    if (!isResolved && item.kind === "activity_routine_suggestion") {
      primary = {
        label: "Passer en routine",
        icon: Sparkles,
        tone: "primary",
        onClick: () =>
          runQuickAction(item, "actioned", () => acceptEvolutionAction(item.entity_id || "", item.id), "accept_evolution",
            "Activité passée en routine avec succès !", "Erreur lors du passage en routine."),
      };
      secondary.push({
        label: "Garder la configuration actuelle",
        icon: X,
        onClick: () =>
          runQuickAction(item, "dismissed", () => declineEvolutionAction(item.entity_id || "", item.id), "decline_evolution",
            "Choix respecté : configuration actuelle conservée.", "Erreur lors de l'enregistrement de votre choix."),
      });
    } else if (!isResolved && (item.kind === "activity_expired" || item.kind === "activity_expiring_soon")) {
      primary = { label: "Renouveler", icon: Sparkles, tone: "primary", onClick: () => openRenewModal(item) };
      secondary.push({
        label: "Laisser expirée",
        icon: X,
        onClick: () =>
          runQuickAction(item, "dismissed", () => keepExpiredAction(item.entity_id || "", item.id), "keep_expired",
            "Activité maintenue expirée sans renouvellement.", "Erreur lors de l'enregistrement de votre choix.", "info"),
      });
    } else if (!isResolved && isDailySummary) {
      primary = {
        label: "Clôturer la journée",
        icon: Check,
        tone: "positive",
        onClick: () => {
          const summaryDate = (item as any).metadata?.date || new Date().toISOString().split("T")[0];
          runQuickAction(item, "resolved", () => validateDailySummaryAction(summaryDate, item.id), null,
            "Bilan de la journée validé avec succès !", "Erreur lors de la validation du bilan.");
        },
      };
    } else if (isTask) {
      group = "task";
      if (!isResolved && item.entity_id) {
        primary = { label: t("actions.mark_done"), icon: Check, tone: "positive", onClick: () => handleResolve(item.id, "task", item.entity_id) };
        secondary.push({ label: "Reporter à demain", icon: Clock, onClick: () => handleTaskPostpone(item.id, item.entity_id, 1) });
      }
    } else if (isIncome) {
      group = "income";
      if (!isResolved && item.entity_id) {
        primary = { label: t("actions.mark_received"), icon: Check, tone: "positive", onClick: () => handleResolve(item.id, "income", item.entity_id) };
      }
    } else if (isExpense || isScheduledExpense) {
      group = "expense";
      if (!isResolved && item.entity_id) {
        primary = {
          label: t("actions.mark_paid"),
          icon: Check,
          tone: "primary",
          onClick: () => handleResolve(item.id, isScheduledExpense ? "scheduled_expense" : "expense", item.entity_id),
        };
      }
    } else if (isActivityOrEvent) {
      group = "activity";
      if (!isResolved && !isInformative && item.entity_id) {
        primary = { label: t("actions.mark_completed"), icon: Check, tone: "positive", onClick: () => handleResolve(item.id, "activity", item.entity_id) };
        secondary.push({ label: "Reporter de 2 heures", icon: Clock, onClick: () => handleEventPostpone(item.id, item.entity_id, 2) });
        secondary.push({ label: "Signaler comme manquée", icon: X, tone: "danger", onClick: () => handleEventMissed(item.id, item.entity_id) });
      }
    }

    if (isUnread && !isDailySummary) {
      secondary.push({ label: "Marquer comme lu", icon: CheckCheck, onClick: () => handleMarkRead(item.id) });
    }
    if (!isResolved && item.status !== "snoozed") {
      secondary.push({ label: "Me le rappeler dans 24 h", icon: Clock, onClick: () => handleSnooze(item.id, 24) });
    }
    secondary.push({
      label: playingId === item.id ? "Arrêter la lecture" : "Écouter",
      icon: playingId === item.id ? VolumeX : Volume2,
      onClick: () => handleSpeak(item),
    });
    secondary.push({ label: t("actions.delete"), icon: Trash2, tone: "danger", onClick: () => handleDelete(item.id) });

    // Pastille de couleur à la place des étiquettes « Critique » / « Action requise »
    const dot = isResolved
      ? null
      : item.priority === "critical"
      ? "bg-danger"
      : item.priority === "high" || primary
      ? "bg-amber-500"
      : isUnread
      ? "bg-signal"
      : null;

    return { isResolved, isUnread, primary, secondary, group, dot };
  };

  const GROUP_LABELS: Record<string, [string, string]> = {
    income: ["paiement attendu", "paiements attendus"],
    expense: ["dépense à régler", "dépenses à régler"],
    task: ["tâche", "tâches"],
    activity: ["séance", "séances"],
  };

  // Regroupement par jour (Aujourd'hui / Hier / Plus tôt), puis par type au sein de chaque jour
  const dayBuckets = useMemo(() => {
    const today = DateTime.now().setZone(timezone).startOf("day");
    const buckets: { key: string; label: string; items: Notification[] }[] = [
      { key: "today", label: "Aujourd'hui", items: [] },
      { key: "yesterday", label: "Hier", items: [] },
      { key: "earlier", label: "Plus tôt", items: [] },
    ];
    for (const n of filtered) {
      const day = DateTime.fromISO(n.created_at, { zone: timezone }).startOf("day");
      const diff = Math.round(today.diff(day, "days").days);
      buckets[diff <= 0 ? 0 : diff === 1 ? 1 : 2]!.items.push(n);
    }
    return buckets.filter((b) => b.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, timezone]);

  const renderRow = (item: Notification, nested = false) => {
    const { isResolved, isUnread, primary, secondary, dot } = describe(item);
    const isThisBusy = processingId === item.id;
    const menuOpen = openMenuId === item.id;
    const PrimaryIcon = primary?.icon;

    return (
      <div
        key={item.id}
        onClick={() => isUnread && handleMarkRead(item.id)}
        className={`relative flex gap-3 px-4 py-3.5 ${nested ? "pl-6" : ""} ${isUnread ? "cursor-pointer" : ""} ${
          isResolved ? "opacity-70" : ""
        }`}
      >
        <span className="relative shrink-0">
          {renderCategoryIcon(item.category, item.kind, isResolved)}
          {dot && (
            <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-canvas-raised dark:ring-ink-900 ${dot}`} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm leading-snug break-words ${
                isResolved
                  ? "line-through decoration-ink-300 text-ink-600 dark:text-ink-400"
                  : isUnread
                  ? "font-semibold text-ink-950 dark:text-white"
                  : "font-medium text-ink-900 dark:text-ink-100"
              }`}
            >
              {item.title}
            </p>
            <span className="shrink-0 pt-0.5 text-[11px] text-ink-400 whitespace-nowrap">
              {DateTime.fromISO(item.created_at, { zone: timezone }).setLocale(locale).toRelative({ style: "short" })}
            </span>
          </div>

          {item.body && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-600 dark:text-ink-400 line-clamp-2 break-words">{item.body}</p>
          )}

          <div className="mt-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {primary && PrimaryIcon && (
              <button
                type="button"
                disabled={isThisBusy}
                onClick={primary.onClick}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                  primary.tone === "positive" ? "bg-positive hover:bg-positive/90" : "bg-signal hover:bg-signal-dark"
                }`}
              >
                {isThisBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PrimaryIcon className="h-3.5 w-3.5" />}
                {primary.label}
              </button>
            )}
            {isResolved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-positive">
                <Check className="h-3 w-3" /> {item.status === "dismissed" ? tr("Écartée") : tr("Traitée")}
              </span>
            )}
            {item.link && (
              <Link
                href={item.link}
                onClick={() => isUnread && handleMarkRead(item.id)}
                className="inline-flex items-center gap-0.5 text-xs font-medium text-signal hover:underline"
              >
                {tr("Voir")}{" "}<ArrowRight className="h-3 w-3" />
              </Link>
            )}

            {/* Menu « ⋯ » : toutes les autres actions */}
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setOpenMenuId(menuOpen ? null : item.id)}
                aria-label={tr("Plus d'actions")}
                aria-expanded={menuOpen}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-0 top-9 z-40 w-56 overflow-hidden rounded-2xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised dark:bg-slate-900 p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    {secondary.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.label}
                          type="button"
                          disabled={isThisBusy}
                          onClick={() => {
                            setOpenMenuId(null);
                            a.onClick();
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors cursor-pointer disabled:opacity-50 ${
                            a.tone === "danger"
                              ? "text-danger hover:bg-danger/10"
                              : "text-ink-700 dark:text-ink-200 hover:bg-ink-100/80 dark:hover:bg-white/5"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative isolate min-h-full w-full space-y-5 min-w-0 max-w-full">
      <PageBackground src="/images/backgrounds/notifications-bg.jpg" />

      {/* En-tête épuré : titre, résumé, guide et « Tout lire » */}
      <div className="rounded-3xl bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md border border-ink-200/80 dark:border-ink-800/80 p-5 sm:p-6 shadow-xs" data-tour="notifications-header">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">
              {t("nav.notifications")}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-600 dark:text-ink-400">
              {activeCount > 0
                ? `${activeCount} à traiter${unreadCount > 0 ? ` · ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : ""}`
                : tr("Vous êtes à jour.")}
            </p>
          </div>
          <SectionGuideTrigger section="notifications" label={tr("Guide")} className="shrink-0" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3" data-tour="notifications-tabs">
          {/* Deux vues seulement : à traiter / historique */}
          <div className="inline-flex rounded-full bg-ink-100/80 dark:bg-white/5 p-1">
            {[
              { key: "active", label: "À traiter", count: activeCount },
              { key: "history", label: "Historique", count: 0 },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-canvas-raised dark:bg-slate-800 text-ink-950 dark:text-white font-semibold shadow-2xs"
                    : "text-ink-600 dark:text-ink-400 font-medium"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="rounded-full bg-signal px-1.5 text-[10px] font-bold leading-4 text-white">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              disabled={isAnyActionPending}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-signal hover:underline disabled:opacity-50 cursor-pointer"
            >
              {isReadingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              {tr("Tout lire")}</button>
          )}
        </div>
      </div>

      {/* Liste groupée par jour */}
      <div data-tour="notifications-list" className="w-full space-y-5">
        {dayBuckets.length === 0 ? (
          <div className="rounded-3xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-positive-soft text-positive">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-ink-950 dark:text-white">{t("actions.empty_title")}</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm text-ink-600 dark:text-ink-400">{t("actions.empty_desc")}</p>
          </div>
        ) : (
          dayBuckets.map((bucket) => {
            // Regroupe les éléments du même type (≥ 2) en une ligne repliable
            const byGroup = new Map<string, Notification[]>();
            const order: string[] = [];
            for (const n of bucket.items) {
              const g = describe(n).group;
              const key = g === "other" ? `single-${n.id}` : g;
              if (!byGroup.has(key)) {
                byGroup.set(key, []);
                order.push(key);
              }
              byGroup.get(key)!.push(n);
            }

            return (
              <section key={bucket.key} className="space-y-2">
                <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                  {bucket.label}
                </h2>
                <div className="rounded-3xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md shadow-xs divide-y divide-ink-200/70 dark:divide-ink-800">
                  {order.map((key) => {
                    const items = byGroup.get(key)!;
                    if (items.length === 1 || key.startsWith("single-")) return renderRow(items[0]!);

                    const groupId = `${bucket.key}-${key}`;
                    const expanded = expandedGroups.has(groupId);
                    const [one, many] = GROUP_LABELS[key] ?? ["élément", "éléments"];
                    const pending = items.filter((n) => !describe(n).isResolved).length;
                    const dots = items.map((n) => describe(n).dot).filter(Boolean) as string[];
                    const topDot = dots.find((d) => d === "bg-danger") ?? dots[0];

                    return (
                      <div key={groupId}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedGroups((prev) => {
                              const next = new Set(prev);
                              if (next.has(groupId)) next.delete(groupId);
                              else next.add(groupId);
                              return next;
                            })
                          }
                          aria-expanded={expanded}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left rounded-3xl hover:bg-ink-100/40 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <span className="relative shrink-0">
                            {renderCategoryIcon(items[0]!.category, items[0]!.kind, pending === 0)}
                            {topDot && (
                              <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-canvas-raised dark:ring-ink-900 ${topDot}`} />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink-950 dark:text-white">
                              {items.length} {items.length > 1 ? many : one}
                            </span>
                            <span className="block truncate text-xs text-ink-600 dark:text-ink-400">
                              {items.map((n) => n.title).slice(0, 2).join(" · ")}
                              {items.length > 2 ? "…" : ""}
                            </span>
                          </span>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </button>
                        {expanded && (
                          <div className="divide-y divide-ink-200/60 dark:divide-ink-800 border-t border-ink-200/60 dark:border-ink-800">
                            {items.map((n) => renderRow(n, true))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
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
                    {tr("Renouveler l'activité")}</h3>
                  <p className="text-xs text-ink-500 truncate max-w-xs">
                    « {renewModal.activityName} »
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={renewSubmitting}
                onClick={() => setRenewModal(null)}
                aria-label={tr("Fermer la boîte de dialogue")}
                className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renewModal.currentEndDate && (
              <div className="p-2.5 rounded-xl bg-ink-100/70 dark:bg-ink-800/70 border border-ink-200/50 dark:border-ink-700/50 text-xs text-ink-600 dark:text-ink-300">
                {tr("Échéance précédente :")}{" "}<span className="font-semibold text-ink-950 dark:text-white">{formatDateLocale(renewModal.currentEndDate, locale, timezone)}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-300 block">
                {tr("Nouvelle date d'échéance")}</label>

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
                {tr("Édition complète")}{" "}<ArrowRight className="w-3 h-3" />
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={renewSubmitting}
                  onClick={() => setRenewModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer min-h-[38px]"
                >
                  {tr("Annuler")}</button>

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
                      showToast(tr("Erreur lors du renouvellement de l'activité."), "error");
                    } finally {
                      setRenewSubmitting(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-signal hover:bg-signal-dark text-white text-xs font-bold active:scale-95 transition-all shadow-2xs tap-active flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[38px]"
                >
                  {renewSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{tr("Renouvellement...")}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{tr("Valider")}</span>
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
