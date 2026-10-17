/**
 * test-quick-actions-reliability.ts
 *
 * Validation complète de la fiabilité du centre de notifications et des actions rapides :
 * 1. Activités : terminer une séance (completed), séance manquée (missed), reporter (postponed).
 * 2. Évolution d'activité : accept_evolution (routine), decline_evolution (répit 30j).
 * 3. Expiration d'activité : keep_expired (status: expired).
 * 4. Tâches : mark_task_done.
 * 5. Finances : mark_received, mark_paid (dépense ponctuelle et programmée).
 * 6. Fiabilité absolue : une notification NE DOIT PAS être résolue si l'action métier échoue.
 * 7. Anti-double-clic & Idempotence : un double-clic sur mark_paid ne génère aucun doublon d'expense.
 * 8. Priorisation : tri chronologique et mise en avant des priorités urgentes/critiques.
 */

import { describe, it } from "node:test";
import assert from "node:assert";

// Simulation d'environnement DB en mémoire pour tester la logique unitaire des routes et actions
class MockDatabase {
  public notifications: any[] = [];
  public calendarEvents: any[] = [];
  public tasks: any[] = [];
  public expenses: any[] = [];
  public scheduledExpenses: any[] = [];
  public income: any[] = [];
  public activities: any[] = [];

  public failNextOperation = false;

  reset() {
    this.notifications = [];
    this.calendarEvents = [];
    this.tasks = [];
    this.expenses = [];
    this.scheduledExpenses = [];
    this.income = [];
    this.activities = [];
    this.failNextOperation = false;
  }
}

const mockDb = new MockDatabase();

// Implémentation du moteur de quick-action simulant la route API avec les mêmes garanties
async function executeQuickAction(
  userId: string,
  params: {
    action: string;
    notificationId?: string;
    entityId?: string;
    hours?: number;
    endDate?: string;
    amount?: number;
    currency?: string;
  }
) {
  const { action, notificationId, entityId, hours } = params;
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.split("T")[0]!;

  if (mockDb.failNextOperation) {
    mockDb.failNextOperation = false;
    return { status: 500, error: "Database error simulated" };
  }

  // 1. REVENU
  if (action === "mark_received" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const inc = mockDb.income.find((i) => i.id === targetId && i.user_id === userId);
    if (!inc) return { status: 404, error: "Revenu introuvable" };

    if (!inc.received) {
      inc.received = true;
      inc.received_at = todayDate;
    }
    resolveNotifs(userId, nowIso, targetId, notificationId);
    return { status: 200, success: true, action: "mark_received" };
  }

  // 2. DÉPENSE & ÉCHÉANCE
  if (action === "mark_paid" && (entityId || notificationId)) {
    // Anti-double-clic : si la notification a déjà été résolue par un premier clic
    if (notificationId) {
      const notif = mockDb.notifications.find((n) => n.id === notificationId && n.user_id === userId);
      if (notif && (notif.status === "resolved" || notif.status === "actioned")) {
        return { status: 200, success: true, action: "mark_paid", duplicateIgnored: true };
      }
    }

    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const exp = mockDb.expenses.find((e) => e.id === targetId && e.user_id === userId);

    if (exp) {
      if (!exp.paid) {
        exp.paid = true;
        exp.paid_at = todayDate;
      }
    } else {
      const sch = mockDb.scheduledExpenses.find((s) => s.id === targetId && s.user_id === userId);
      if (!sch) return { status: 404, error: "Dépense ou échéance introuvable" };

      const effectiveDueDate = sch.next_due_date || todayDate;

      // Idempotence & anti-double-clic
      if (sch.frequency === "once" && sch.status === "paid") {
        resolveNotifs(userId, nowIso, targetId, notificationId);
        return { status: 200, success: true, action: "mark_paid", idempotent: true };
      }

      // Anti-double-clic temporel : vérifier si une dépense identique existe déjà
      const existingExp = mockDb.expenses.find(
        (e) =>
          e.user_id === userId &&
          e.amount === Number(sch.amount) &&
          e.label === (sch.name || "Dépense programmée")
      );

      if (existingExp) {
        resolveNotifs(userId, nowIso, targetId, notificationId);
        return { status: 200, success: true, action: "mark_paid", duplicateIgnored: true };
      }

      if (!existingExp) {
        mockDb.expenses.push({
          id: `exp-${Date.now()}-${Math.random()}`,
          user_id: userId,
          label: sch.name || "Dépense programmée",
          amount: Number(sch.amount) || 0,
          due_date: effectiveDueDate,
          paid: true,
          activity_id: sch.activity_id || null,
        });
      }

      if (sch.frequency === "once") {
        sch.status = "paid";
      } else {
        const curDate = new Date(effectiveDueDate);
        curDate.setMonth(curDate.getMonth() + 1);
        sch.next_due_date = curDate.toISOString().split("T")[0];
      }
    }

    resolveNotifs(userId, nowIso, targetId, notificationId);
    return { status: 200, success: true, action: "mark_paid" };
  }

  // 3. TÂCHE
  if (action === "mark_task_done" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const task = mockDb.tasks.find((t) => t.id === targetId && t.user_id === userId);
    if (!task) return { status: 404, error: "Tâche introuvable" };

    task.status = "done";
    task.completed_at = nowIso;
    resolveNotifs(userId, nowIso, targetId, notificationId);
    return { status: 200, success: true, action: "mark_task_done" };
  }

  // 3b. REPORTER TÂCHE
  if (action === "postpone_task" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const task = mockDb.tasks.find((t) => t.id === targetId && t.user_id === userId);
    if (!task) return { status: 404, error: "Tâche introuvable" };

    const curDate = task.due_date ? new Date(task.due_date) : new Date();
    const nextDate = new Date(curDate.getTime() + 24 * 3600 * 1000);
    task.due_date = nextDate.toISOString().split("T")[0];
    task.status = "todo";

    const snoozedUntil = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    mockDb.notifications
      .filter((n) => (n.id === notificationId || n.entity_id === targetId) && n.user_id === userId)
      .forEach((n) => {
        n.status = "snoozed";
        n.snoozed_until = snoozedUntil;
      });

    return { status: 200, success: true, action: "postpone_task", newDueDate: task.due_date };
  }

  // 4. SÉANCE DU CALENDRIER (COMPLETED)
  if ((action === "mark_event_done" || action === "mark_event_completed") && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const evt = mockDb.calendarEvents.find((e) => (e.id === targetId || e.activity_id === targetId) && e.user_id === userId);
    if (evt) {
      evt.status = "completed";
      evt.updated_at = nowIso;
    }
    resolveNotifs(userId, nowIso, targetId, notificationId);
    return { status: 200, success: true, action: "mark_event_completed" };
  }

  // 5. SÉANCE MANQUÉE (MISSED)
  if (action === "mark_event_missed" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const evt = mockDb.calendarEvents.find((e) => (e.id === targetId || e.activity_id === targetId) && e.user_id === userId);
    if (evt) {
      evt.status = "missed";
      evt.updated_at = nowIso;
    }
    resolveNotifs(userId, nowIso, targetId, notificationId);
    return { status: 200, success: true, action: "mark_event_missed" };
  }

  // 6. REPORTER UNE SÉANCE (POSTPONE)
  if (action === "postpone_event" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const postponeHours = hours && hours > 0 ? hours : 2;
    const evt = mockDb.calendarEvents.find((e) => (e.id === targetId || e.activity_id === targetId) && e.user_id === userId);

    let snoozedUntil = new Date(Date.now() + postponeHours * 3600 * 1000).toISOString();

    if (evt) {
      const curStart = new Date(evt.starts_at);
      const curEnd = new Date(evt.ends_at);
      const durationMs = curEnd.getTime() - curStart.getTime();

      const newStart = new Date(curStart.getTime() + postponeHours * 3600 * 1000);
      const newEnd = new Date(newStart.getTime() + durationMs);

      evt.status = "postponed";
      evt.starts_at = newStart.toISOString();
      evt.ends_at = newEnd.toISOString();
      evt.is_exception = true;
      evt.updated_at = nowIso;
      snoozedUntil = newStart.toISOString();
    }

    // Snooze notification
    mockDb.notifications
      .filter((n) => (n.id === notificationId || n.entity_id === targetId) && n.user_id === userId)
      .forEach((n) => {
        n.status = "snoozed";
        n.snoozed_until = snoozedUntil;
      });

    return { status: 200, success: true, action: "postpone_event", snoozedUntil };
  }

  // 7. ÉVOLUTION ROUTINE
  if (action === "accept_evolution" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const act = mockDb.activities.find((a) => a.id === targetId && a.user_id === userId);
    if (!act) return { status: 404, error: "Activité introuvable" };

    act.engagement_nature = "routine";
    act.updated_at = nowIso;
    resolveNotifs(userId, nowIso, targetId, notificationId);
    return { status: 200, success: true, action: "accept_evolution" };
  }

  if (action === "decline_evolution" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const snoozedUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    mockDb.notifications
      .filter((n) => (n.id === notificationId || n.entity_id === targetId) && n.user_id === userId)
      .forEach((n) => {
        n.status = "dismissed";
        n.snoozed_until = snoozedUntil;
      });
    return { status: 200, success: true, action: "decline_evolution", snoozedUntil };
  }

  // 8. LAISSER EXPIRÉE
  if (action === "keep_expired" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const act = mockDb.activities.find((a) => a.id === targetId && a.user_id === userId);
    if (act) {
      act.status = "expired";
      act.updated_at = nowIso;
    }
    resolveNotifs(userId, nowIso, targetId, notificationId);
    return { status: 200, success: true, action: "keep_expired" };
  }

  // 9. RENOUVELER UNE ACTIVITÉ
  if (action === "renew_activity" && (entityId || notificationId)) {
    const targetId = entityId || mockDb.notifications.find((n) => n.id === notificationId)?.entity_id;
    const act = mockDb.activities.find((a) => a.id === targetId && a.user_id === userId);
    if (!act) return { status: 404, error: "Activité introuvable" };
    if (!params.endDate) return { status: 400, error: "Date de fin requise" };
    if (act.start_date && params.endDate < act.start_date) {
      return { status: 400, error: "La date de fin ne peut pas être antérieure à la date de début" };
    }

    act.status = "active";
    act.validity_type = "temporary";
    act.end_date = params.endDate;
    if (params.amount !== undefined) act.amount = params.amount;
    act.updated_at = nowIso;

    resolveNotifs(userId, nowIso, targetId, notificationId);
    return { status: 200, success: true, action: "renew_activity" };
  }

  return { status: 400, error: "Action inconnue" };
}

function resolveNotifs(userId: string, nowIso: string, entityId?: string, notificationId?: string) {
  mockDb.notifications
    .filter((n) => n.user_id === userId && (n.id === notificationId || (entityId && n.entity_id === entityId)))
    .forEach((n) => {
      n.status = "resolved";
      n.resolved_at = nowIso;
      n.actioned_at = nowIso;
      n.read_at = nowIso;
    });
}

// Fonction de tri du centre de notification
function sortNotifications(notifications: any[], activeTab: string) {
  return [...notifications].sort((a, b) => {
    const isResolvedA = a.status === "resolved" || a.status === "dismissed" || a.status === "actioned";
    const isResolvedB = b.status === "resolved" || b.status === "dismissed" || b.status === "actioned";

    if (activeTab === "history") {
      const dateA = new Date(a.resolved_at || a.actioned_at || a.created_at).getTime();
      const dateB = new Date(b.resolved_at || b.actioned_at || b.created_at).getTime();
      return dateB - dateA;
    }

    if (activeTab === "all" && isResolvedA !== isResolvedB) {
      return isResolvedA ? 1 : -1;
    }

    const priorityWeight = (p: string) => (p === "critical" ? 4 : p === "high" ? 3 : p === "normal" ? 2 : 1);
    const isUrgentA = priorityWeight(a.priority) >= 3;
    const isUrgentB = priorityWeight(b.priority) >= 3;
    if (isUrgentA !== isUrgentB) {
      return isUrgentA ? -1 : 1;
    }

    const timeA = new Date(a.scheduled_at || a.created_at).getTime();
    const timeB = new Date(b.scheduled_at || b.created_at).getTime();
    return timeB - timeA;
  });
}

console.log("\n=======================================================");
console.log("TESTS DE FIABILITÉ : CENTRE DE NOTIFICATIONS & ACTIONS RAPIDES");
console.log("=======================================================\n");

const userId = "user-test-reliability";

// Test 1 : Séance d'activité - Terminer
mockDb.reset();
mockDb.calendarEvents.push({
  id: "evt-1",
  activity_id: "act-1",
  user_id: userId,
  title: "Séance Musculation",
  status: "planned",
  starts_at: "2026-10-16T10:00:00Z",
  ends_at: "2026-10-16T11:00:00Z",
});
mockDb.notifications.push({
  id: "notif-evt-1",
  user_id: userId,
  category: "activity",
  kind: "activity_reminder_now",
  entity_type: "activity",
  entity_id: "evt-1",
  status: "unread",
  priority: "high",
  title: "Séance en cours : Musculation",
});

describe("1. Actions rapides d'activités", () => {
  it("Terminer une séance met le statut à 'completed' et résout la notification", async () => {
    const res = await executeQuickAction(userId, {
      action: "mark_event_completed",
      notificationId: "notif-evt-1",
      entityId: "evt-1",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.calendarEvents[0].status, "completed");
    assert.strictEqual(mockDb.notifications[0].status, "resolved");
    console.log("  [PASS] Séance terminée et notification résolue");
  });

  it("Signaler une séance manquée met le statut à 'missed' et résout la notification", async () => {
    mockDb.reset();
    mockDb.calendarEvents.push({
      id: "evt-2",
      user_id: userId,
      title: "Séance Yoga",
      status: "planned",
      starts_at: "2026-10-16T14:00:00Z",
      ends_at: "2026-10-16T15:00:00Z",
    });
    mockDb.notifications.push({
      id: "notif-evt-2",
      user_id: userId,
      category: "activity",
      entity_id: "evt-2",
      status: "unread",
      priority: "normal",
      title: "Séance Yoga",
    });

    const res = await executeQuickAction(userId, {
      action: "mark_event_missed",
      notificationId: "notif-evt-2",
      entityId: "evt-2",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.calendarEvents[0].status, "missed");
    assert.strictEqual(mockDb.notifications[0].status, "resolved");
    console.log("  [PASS] Séance manquée enregistrée et notification résolue");
  });

  it("Reporter une séance décale les horaires et met la notification en 'snoozed'", async () => {
    mockDb.reset();
    const originalStart = "2026-10-16T10:00:00.000Z";
    const originalEnd = "2026-10-16T11:00:00.000Z";
    mockDb.calendarEvents.push({
      id: "evt-3",
      user_id: userId,
      title: "Séance Natation",
      status: "planned",
      starts_at: originalStart,
      ends_at: originalEnd,
    });
    mockDb.notifications.push({
      id: "notif-evt-3",
      user_id: userId,
      category: "activity",
      entity_id: "evt-3",
      status: "unread",
      priority: "high",
      title: "Séance Natation",
    });

    const res = await executeQuickAction(userId, {
      action: "postpone_event",
      notificationId: "notif-evt-3",
      entityId: "evt-3",
      hours: 2,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.calendarEvents[0].status, "postponed");
    assert.strictEqual(mockDb.calendarEvents[0].is_exception, true);
    // starts_at décalé de 2h
    const newStart = new Date(mockDb.calendarEvents[0].starts_at).getTime();
    const oldStart = new Date(originalStart).getTime();
    assert.strictEqual(newStart - oldStart, 2 * 3600 * 1000);
    assert.strictEqual(mockDb.notifications[0].status, "snoozed");
    console.log("  [PASS] Séance reportée de 2h et notification mise en rappel");
  });
});

describe("1b. Actions rapides sur les tâches", () => {
  it("Terminer une tâche met le statut à 'done' et résout la notification", async () => {
    mockDb.reset();
    mockDb.tasks.push({
      id: "task-test-1",
      user_id: userId,
      title: "Rédiger compte-rendu",
      status: "todo",
      due_date: "2026-10-16",
    });
    mockDb.notifications.push({
      id: "notif-task-1",
      user_id: userId,
      category: "task",
      entity_id: "task-test-1",
      status: "unread",
      priority: "high",
    });

    const res = await executeQuickAction(userId, {
      action: "mark_task_done",
      notificationId: "notif-task-1",
      entityId: "task-test-1",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.tasks[0].status, "done");
    assert.strictEqual(mockDb.notifications[0].status, "resolved");
    console.log("  [PASS] Tâche terminée et notification résolue");
  });

  it("Reporter une tâche décale son échéance au lendemain et met la notification en 'snoozed'", async () => {
    mockDb.reset();
    mockDb.tasks.push({
      id: "task-test-2",
      user_id: userId,
      title: "Envoyer facture",
      status: "todo",
      due_date: "2026-10-16",
    });
    mockDb.notifications.push({
      id: "notif-task-2",
      user_id: userId,
      category: "task",
      entity_id: "task-test-2",
      status: "unread",
      priority: "high",
    });

    const res = await executeQuickAction(userId, {
      action: "postpone_task",
      notificationId: "notif-task-2",
      entityId: "task-test-2",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.tasks[0].status, "todo");
    assert.strictEqual(mockDb.tasks[0].due_date, "2026-10-17");
    assert.strictEqual(mockDb.notifications[0].status, "snoozed");
    console.log("  [PASS] Tâche reportée au lendemain et notification mise en sommeil");
  });
});

describe("2. Évolution d'activités & Expiration", () => {
  it("Accepter l'évolution passe l'activité en routine et résout la notification", async () => {
    mockDb.reset();
    mockDb.activities.push({
      id: "act-dev",
      user_id: userId,
      title: "Méditation",
      engagement_nature: "punctual",
    });
    mockDb.notifications.push({
      id: "notif-evo",
      user_id: userId,
      category: "activity",
      kind: "activity_routine_suggestion",
      entity_id: "act-dev",
      status: "unread",
      priority: "normal",
      title: "Suggestion de routine",
    });

    const res = await executeQuickAction(userId, {
      action: "accept_evolution",
      notificationId: "notif-evo",
      entityId: "act-dev",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.activities[0].engagement_nature, "routine");
    assert.strictEqual(mockDb.notifications[0].status, "resolved");
    console.log("  [PASS] Évolution vers une routine acceptée");
  });

  it("Refuser l'évolution accorde un répit de 30 jours et écarte la notification", async () => {
    mockDb.reset();
    mockDb.activities.push({
      id: "act-dev-2",
      user_id: userId,
      engagement_nature: "punctual",
    });
    mockDb.notifications.push({
      id: "notif-evo-2",
      user_id: userId,
      category: "activity",
      kind: "activity_routine_suggestion",
      entity_id: "act-dev-2",
      status: "unread",
      priority: "normal",
    });

    const res = await executeQuickAction(userId, {
      action: "decline_evolution",
      notificationId: "notif-evo-2",
      entityId: "act-dev-2",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.activities[0].engagement_nature, "punctual"); // inchangé
    assert.strictEqual(mockDb.notifications[0].status, "dismissed");
    assert.ok(mockDb.notifications[0].snoozed_until);
    console.log("  [PASS] Refus d'évolution avec répit de 30 jours");
  });

  it("Laisser expirée met le statut de l'activité à 'expired' et résout la notification", async () => {
    mockDb.reset();
    mockDb.activities.push({
      id: "act-exp",
      user_id: userId,
      status: "active",
      validity_type: "temporary",
    });
    mockDb.notifications.push({
      id: "notif-exp",
      user_id: userId,
      category: "activity",
      kind: "activity_expired",
      entity_id: "act-exp",
      status: "unread",
      priority: "high",
    });

    const res = await executeQuickAction(userId, {
      action: "keep_expired",
      notificationId: "notif-exp",
      entityId: "act-exp",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.activities[0].status, "expired");
    assert.strictEqual(mockDb.notifications[0].status, "resolved");
    console.log("  [PASS] Activité conservée expirée");
  });

  it("Renouveler une activité réactive l'activité avec sa nouvelle échéance et résout la notification", async () => {
    mockDb.reset();
    mockDb.activities.push({
      id: "act-renew-1",
      user_id: userId,
      title: "Contrat Consultant",
      status: "expired",
      validity_type: "temporary",
      start_date: "2026-01-01",
      end_date: "2026-06-30",
    });
    mockDb.notifications.push({
      id: "notif-renew-1",
      user_id: userId,
      category: "activity",
      kind: "activity_expired",
      entity_id: "act-renew-1",
      status: "unread",
      priority: "high",
    });

    const res = await executeQuickAction(userId, {
      action: "renew_activity",
      notificationId: "notif-renew-1",
      entityId: "act-renew-1",
      endDate: "2026-12-31",
      amount: 120000,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockDb.activities[0].status, "active");
    assert.strictEqual(mockDb.activities[0].validity_type, "temporary");
    assert.strictEqual(mockDb.activities[0].end_date, "2026-12-31");
    assert.strictEqual(mockDb.activities[0].amount, 120000);
    assert.strictEqual(mockDb.notifications[0].status, "resolved");
    console.log("  [PASS] Activité renouvelée avec succès et notification résolue");
  });

  it("Renouveler avec une date invalide échoue et NE résout PAS la notification", async () => {
    mockDb.reset();
    mockDb.activities.push({
      id: "act-renew-2",
      user_id: userId,
      title: "Mission",
      status: "expired",
      validity_type: "temporary",
      start_date: "2026-05-01",
      end_date: "2026-06-01",
    });
    mockDb.notifications.push({
      id: "notif-renew-2",
      user_id: userId,
      category: "activity",
      kind: "activity_expired",
      entity_id: "act-renew-2",
      status: "unread",
      priority: "high",
    });

    // Date de fin antérieure à la date de début
    const res = await executeQuickAction(userId, {
      action: "renew_activity",
      notificationId: "notif-renew-2",
      entityId: "act-renew-2",
      endDate: "2026-04-01",
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(mockDb.activities[0].status, "expired"); // inchangé
    assert.strictEqual(mockDb.notifications[0].status, "unread"); // IMPÉRATIF : non résolue
    console.log("  [PASS] Renouvellement invalide rejeté sans altérer la notification");
  });
});

describe("3. Fiabilité des actions : échec métier = notification NON résolue", () => {
  it("Si une action métier échoue (ex: erreur SQL ou entité introuvable), la notification RESTE intacte", async () => {
    mockDb.reset();
    mockDb.notifications.push({
      id: "notif-fail-check",
      user_id: userId,
      category: "task",
      entity_id: "task-inexistante",
      status: "unread",
      priority: "high",
    });

    // Action sur tâche inexistante
    const res = await executeQuickAction(userId, {
      action: "mark_task_done",
      notificationId: "notif-fail-check",
      entityId: "task-inexistante",
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(mockDb.notifications[0].status, "unread"); // IMPÉRATIF : resté unread !
    console.log("  [PASS] Notification NON résolue en cas d'erreur métier");
  });

  it("Si le serveur rencontre une erreur de base, la notification ne change pas d'état", async () => {
    mockDb.reset();
    mockDb.tasks.push({
      id: "task-1",
      user_id: userId,
      status: "todo",
    });
    mockDb.notifications.push({
      id: "notif-db-fail",
      user_id: userId,
      category: "task",
      entity_id: "task-1",
      status: "unread",
      priority: "high",
    });

    mockDb.failNextOperation = true;
    const res = await executeQuickAction(userId, {
      action: "mark_task_done",
      notificationId: "notif-db-fail",
      entityId: "task-1",
    });

    assert.strictEqual(res.status, 500);
    assert.strictEqual(mockDb.tasks[0].status, "todo");
    assert.strictEqual(mockDb.notifications[0].status, "unread");
    console.log("  [PASS] Notification protégée en cas de défaillance DB");
  });
});

describe("4. Idempotence & Protection anti-double-clic financier", () => {
  it("Un double-clic rapide sur mark_paid d'une dépense programmée ne crée qu'UNE SEULE dépense", async () => {
    mockDb.reset();
    mockDb.scheduledExpenses.push({
      id: "sch-1",
      user_id: userId,
      name: "Abonnement Salle",
      amount: 25000,
      next_due_date: "2026-10-20",
      frequency: "monthly",
      status: "planned",
    });
    mockDb.notifications.push({
      id: "notif-sch-1",
      user_id: userId,
      category: "expense",
      entity_id: "sch-1",
      status: "unread",
    });

    // Clic 1
    const res1 = await executeQuickAction(userId, {
      action: "mark_paid",
      notificationId: "notif-sch-1",
      entityId: "sch-1",
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(mockDb.expenses.length, 1);

    // Clic 2 (simultané ou immédiat)
    const res2 = await executeQuickAction(userId, {
      action: "mark_paid",
      notificationId: "notif-sch-1",
      entityId: "sch-1",
    });
    assert.strictEqual(res2.status, 200);
    // IL DOIT Y AVOIR EXACTEMENT 1 DÉPENSE EN BASE
    assert.strictEqual(mockDb.expenses.length, 1);
    console.log("  [PASS] Zéro doublon financier lors d'un double-clic sur mark_paid");
  });

  it("Double-clic sur mark_received ne duplique aucun statut et reste idempotent", async () => {
    mockDb.reset();
    mockDb.income.push({
      id: "inc-1",
      user_id: userId,
      amount: 150000,
      received: false,
    });
    mockDb.notifications.push({
      id: "notif-inc-1",
      user_id: userId,
      category: "payment",
      entity_id: "inc-1",
      status: "unread",
    });

    // Clic 1
    const res1 = await executeQuickAction(userId, {
      action: "mark_received",
      notificationId: "notif-inc-1",
      entityId: "inc-1",
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(mockDb.income[0].received, true);

    // Clic 2
    const res2 = await executeQuickAction(userId, {
      action: "mark_received",
      notificationId: "notif-inc-1",
      entityId: "inc-1",
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(mockDb.income[0].received, true);
    console.log("  [PASS] mark_received est strictement idempotent");
  });
});

describe("5. Priorisation et affichage", () => {
  it("Les notifications critiques et urgentes apparaissent en tête, suivies des plus récentes", () => {
    const list = [
      { id: "n1", priority: "normal", created_at: "2026-10-16T10:00:00Z", status: "unread" },
      { id: "n2", priority: "critical", created_at: "2026-10-16T08:00:00Z", status: "unread" }, // critique mais plus ancienne
      { id: "n3", priority: "high", created_at: "2026-10-16T09:00:00Z", status: "unread" }, // urgent
      { id: "n4", priority: "normal", created_at: "2026-10-16T11:00:00Z", status: "unread" }, // normal mais récente
    ];

    const sorted = sortNotifications(list, "active");

    // n2 (critical) et n3 (high) doivent être en premier
    assert.strictEqual(sorted[0].id, "n3"); // high, 09:00 > critical 08:00 dans le tier urgent
    assert.strictEqual(sorted[1].id, "n2"); // critical, 08:00
    // Puis tier normal : la plus récente n4 (11:00) avant n1 (10:00)
    assert.strictEqual(sorted[2].id, "n4");
    assert.strictEqual(sorted[3].id, "n1");
    console.log("  [PASS] Priorisation correcte : Urgences en tête, puis tri chronologique récent");
  });

  it("L'onglet historique trie par date de résolution décroissante", () => {
    const list = [
      { id: "h1", resolved_at: "2026-10-15T10:00:00Z", status: "resolved" },
      { id: "h2", resolved_at: "2026-10-16T12:00:00Z", status: "resolved" },
      { id: "h3", resolved_at: "2026-10-16T08:00:00Z", status: "resolved" },
    ];

    const sorted = sortNotifications(list, "history");
    assert.strictEqual(sorted[0].id, "h2"); // le plus récemment résolu
    assert.strictEqual(sorted[1].id, "h3");
    assert.strictEqual(sorted[2].id, "h1");
    console.log("  [PASS] Historique trié par date de résolution décroissante");
  });
});
