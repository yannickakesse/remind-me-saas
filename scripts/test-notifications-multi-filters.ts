import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";

// Helper mocking notification actionable check
function isNotificationActionable(n: any): boolean {
  const isResolved = n.status === "resolved" || n.status === "dismissed" || n.status === "actioned";
  if (isResolved) return false;

  return (
    n.kind === "activity_routine_suggestion" ||
    n.kind === "activity_expired" ||
    n.kind === "activity_expiring_soon" ||
    n.entity_type === "daily_summary" ||
    n.kind === "evening_checkin" ||
    Boolean(n.metadata && n.metadata.is_daily_summary) ||
    Boolean((n.category === "task" || n.entity_type === "task") && n.entity_id) ||
    Boolean((n.category === "payment" || n.entity_type === "income") && n.entity_id) ||
    Boolean((n.category === "expense" || n.entity_type === "expense" || n.entity_type === "scheduled_expense") && n.entity_id) ||
    Boolean(
      (n.category === "activity" || n.entity_type === "activity" || n.kind.includes("activity")) &&
      n.entity_id &&
      !n.kind.includes("activity_upcoming") &&
      !(n.metadata && n.metadata.is_informative)
    )
  );
}

// Filter engine matching components/notifications/notifications-center.tsx
function filterNotifications(
  items: any[],
  opts: {
    activeTab: string;
    searchQuery: string;
    filterType: string;
    filterStatus: string;
    filterPeriod: string;
    customDateFrom?: string;
    customDateTo?: string;
    filterActivityId: string;
    filterPriority: string;
    timezone: string;
  }
) {
  const {
    activeTab,
    searchQuery,
    filterType,
    filterStatus,
    filterPeriod,
    customDateFrom,
    customDateTo,
    filterActivityId,
    filterPriority,
    timezone,
  } = opts;

  return items
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

      // 1. Onglet
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

      // 2. Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchBody = n.body.toLowerCase().includes(q);
        if (!matchTitle && !matchBody) return false;
      }

      // 3. Type
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

      // 4. État
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

      // 5. Période
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

      // 6. Activité
      if (filterActivityId !== "all") {
        const notifActId =
          n.metadata?.activity_id ||
          n.metadata?.activityId ||
          (n.entity_type === "activity" ? n.entity_id : null);
        if (notifActId !== filterActivityId && n.entity_id !== filterActivityId) {
          return false;
        }
      }

      // 7. Priorité
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
      if (activeTab === "history") {
        const dateA = new Date(a.resolved_at || a.actioned_at || a.created_at).getTime();
        const dateB = new Date(b.resolved_at || b.actioned_at || b.created_at).getTime();
        return dateB - dateA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

test("1. Recherche textuelle multi-critères", () => {
  const dataset = [
    { id: "1", title: "Facture Client ABC", body: "En attente de paiement", category: "payment", entity_type: "income", priority: "critical", status: "unread", created_at: new Date().toISOString() },
    { id: "2", title: "Séance de Tennis", body: "Rappel pour ce soir", category: "activity", entity_type: "activity", priority: "normal", status: "unread", created_at: new Date().toISOString() },
  ];

  const resTitle = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "Facture",
    filterType: "all",
    filterStatus: "all",
    filterPeriod: "all",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "Europe/Paris",
  });
  assert.equal(resTitle.length, 1);
  assert.equal(resTitle[0].id, "1");

  const resBody = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "ce soir",
    filterType: "all",
    filterStatus: "all",
    filterPeriod: "all",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "Europe/Paris",
  });
  assert.equal(resBody.length, 1);
  assert.equal(resBody[0].id, "2");
});

test("2. Filtrage par Type", () => {
  const dataset = [
    { id: "1", title: "Facture", body: "", category: "payment", entity_type: "income", priority: "high", status: "unread", created_at: new Date().toISOString() },
    { id: "2", title: "Séance", body: "", category: "activity", kind: "activity_session_reminder", entity_type: "calendar_event", priority: "normal", status: "unread", created_at: new Date().toISOString() },
    { id: "3", title: "Tâche urgente", body: "", category: "task", entity_type: "task", priority: "normal", status: "unread", created_at: new Date().toISOString() },
    { id: "4", title: "Routine suggestion", body: "", category: "activity", kind: "activity_routine_suggestion", entity_type: "activity", priority: "normal", status: "unread", created_at: new Date().toISOString() },
    { id: "5", title: "Activité expirée", body: "", category: "activity", kind: "activity_expired", entity_type: "activity", priority: "high", status: "unread", created_at: new Date().toISOString() },
  ];

  const finances = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "",
    filterType: "finance",
    filterStatus: "all",
    filterPeriod: "all",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "UTC",
  });
  assert.equal(finances.length, 1);
  assert.equal(finances[0].id, "1");

  const evolutions = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "",
    filterType: "evolution",
    filterStatus: "all",
    filterPeriod: "all",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "UTC",
  });
  assert.equal(evolutions.length, 1);
  assert.equal(evolutions[0].id, "4");

  const expirations = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "",
    filterType: "expiration",
    filterStatus: "all",
    filterPeriod: "all",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "UTC",
  });
  assert.equal(expirations.length, 1);
  assert.equal(expirations[0].id, "5");
});

test("3. Filtrage par État et Action Requise", () => {
  const dataset = [
    { id: "1", title: "Non lue", body: "", category: "task", entity_id: "t1", entity_type: "task", priority: "normal", status: "unread", read_at: null, created_at: new Date().toISOString() },
    { id: "2", title: "Lue mais non traitée", body: "", category: "task", entity_id: "t2", entity_type: "task", priority: "normal", status: "read", read_at: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: "3", title: "Résolue", body: "", category: "task", entity_id: "t3", entity_type: "task", priority: "normal", status: "resolved", resolved_at: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: "4", title: "Écartée", body: "", category: "task", entity_id: "t4", entity_type: "task", priority: "normal", status: "dismissed", resolved_at: new Date().toISOString(), created_at: new Date().toISOString() },
  ];

  const unreadOnly = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "",
    filterType: "all",
    filterStatus: "unread",
    filterPeriod: "all",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "UTC",
  });
  assert.equal(unreadOnly.length, 1);
  assert.equal(unreadOnly[0].id, "1");

  const actionPending = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "",
    filterType: "all",
    filterStatus: "action_pending",
    filterPeriod: "all",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "UTC",
  });
  // id 1 and id 2 both have entity_id and are not resolved -> actionable
  assert.equal(actionPending.length, 2);

  const resolvedOnly = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "",
    filterType: "all",
    filterStatus: "resolved",
    filterPeriod: "all",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "UTC",
  });
  assert.equal(resolvedOnly.length, 1);
  assert.equal(resolvedOnly[0].id, "3");
});

test("4. Filtrage par Période (avec resolved_at pour historique)", () => {
  const now = DateTime.now().setZone("Europe/Paris");
  const dataset = [
    {
      id: "today_act",
      title: "Action d'aujourd'hui",
      body: "",
      category: "task",
      priority: "normal",
      status: "unread",
      created_at: now.toISO()!,
    },
    {
      id: "ten_days_ago",
      title: "Vieux rappel",
      body: "",
      category: "task",
      priority: "normal",
      status: "unread",
      created_at: now.minus({ days: 10 }).toISO()!,
    },
    {
      id: "resolved_today",
      title: "Résolu aujourd'hui mais créé il y a 20 jours",
      body: "",
      category: "task",
      priority: "normal",
      status: "resolved",
      created_at: now.minus({ days: 20 }).toISO()!,
      resolved_at: now.toISO()!,
    },
  ];

  // 7 derniers jours sur onglet actif
  const last7d = filterNotifications(dataset, {
    activeTab: "active",
    searchQuery: "",
    filterType: "all",
    filterStatus: "all",
    filterPeriod: "7d",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "Europe/Paris",
  });
  assert.equal(last7d.length, 1);
  assert.equal(last7d[0].id, "today_act");

  // Historique filtré aujourd'hui : doit trouver `resolved_today` grâce à resolved_at
  const historyToday = filterNotifications(dataset, {
    activeTab: "history",
    searchQuery: "",
    filterType: "all",
    filterStatus: "all",
    filterPeriod: "today",
    filterActivityId: "all",
    filterPriority: "all",
    timezone: "Europe/Paris",
  });
  assert.equal(historyToday.length, 1);
  assert.equal(historyToday[0].id, "resolved_today");
});

test("5. Filtrage par Activité concernée", () => {
  const dataset = [
    {
      id: "1",
      title: "Paiement Coaching",
      body: "",
      category: "payment",
      entity_type: "income",
      entity_id: "act-123",
      metadata: { activity_id: "act-123", activityName: "Coaching Pro" },
      status: "unread",
      priority: "high",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Séance Yoga",
      body: "",
      category: "activity",
      entity_type: "activity",
      entity_id: "act-456",
      metadata: { activity_id: "act-456", activityName: "Yoga Matin" },
      status: "unread",
      priority: "normal",
      created_at: new Date().toISOString(),
    },
  ];

  const forCoaching = filterNotifications(dataset, {
    activeTab: "all",
    searchQuery: "",
    filterType: "all",
    filterStatus: "all",
    filterPeriod: "all",
    filterActivityId: "act-123",
    filterPriority: "all",
    timezone: "UTC",
  });
  assert.equal(forCoaching.length, 1);
  assert.equal(forCoaching[0].id, "1");
});

test("6. Combinaison multi-critères simultanée", () => {
  // Exemple de la consigne : retrouver les notifications financières non résolues concernant une activité précise au cours des 30 derniers jours
  const now = DateTime.now().setZone("Europe/Paris");
  const dataset = [
    {
      id: "match",
      title: "Facture Honoraires",
      body: "Paiement en attente",
      category: "payment",
      entity_type: "income",
      metadata: { activity_id: "act-expert" },
      priority: "critical",
      status: "unread",
      created_at: now.minus({ days: 5 }).toISO()!,
    },
    {
      id: "not_matching_activity",
      title: "Facture Autre",
      body: "Paiement en attente",
      category: "payment",
      entity_type: "income",
      metadata: { activity_id: "act-other" },
      priority: "critical",
      status: "unread",
      created_at: now.minus({ days: 5 }).toISO()!,
    },
    {
      id: "not_matching_period",
      title: "Facture Ancienne",
      body: "Paiement en attente",
      category: "payment",
      entity_type: "income",
      metadata: { activity_id: "act-expert" },
      priority: "critical",
      status: "unread",
      created_at: now.minus({ days: 45 }).toISO()!,
    },
    {
      id: "not_matching_status",
      title: "Facture Déjà Payée",
      body: "Payée",
      category: "payment",
      entity_type: "income",
      metadata: { activity_id: "act-expert" },
      priority: "critical",
      status: "resolved",
      resolved_at: now.minus({ days: 2 }).toISO()!,
      created_at: now.minus({ days: 5 }).toISO()!,
    },
  ];

  const res = filterNotifications(dataset, {
    activeTab: "active", // non résolues
    searchQuery: "Facture",
    filterType: "finance",
    filterStatus: "unread",
    filterPeriod: "30d",
    filterActivityId: "act-expert",
    filterPriority: "critical",
    timezone: "Europe/Paris",
  });

  assert.equal(res.length, 1);
  assert.equal(res[0].id, "match");
});
