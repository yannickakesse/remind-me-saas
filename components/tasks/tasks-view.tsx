"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TaskCard, type TaskItemData } from "./task-card";
import { buttonClasses } from "@/components/ui/button";
import type { TaskPriority, TaskStatus } from "@/types/database";

export type TaskTab = "all" | "overdue" | "today" | "upcoming" | "no_date" | "completed";

interface TasksViewProps {
  tasks: TaskItemData[];
  activities: { id: string; name: string; color: string | null }[];
}

export function TasksView({ tasks, activities }: TasksViewProps) {
  const [activeTab, setActiveTab] = useState<TaskTab>("all");
  const [selectedActivity, setSelectedActivity] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const todayStr = new Date().toISOString().slice(0, 10);

  // Groupement temporel et calculs des compteurs
  const counts = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;
    let noDateCount = 0;
    let completedCount = 0;
    let activeTotal = 0;

    for (const t of tasks) {
      const isDone = t.status === "done";
      const isCancelled = t.status === "cancelled";

      if (isDone || isCancelled) {
        completedCount++;
      } else {
        activeTotal++;
        if (!t.due_date) {
          noDateCount++;
        } else if (t.due_date < todayStr) {
          overdueCount++;
        } else if (t.due_date === todayStr) {
          todayCount++;
        } else {
          upcomingCount++;
        }
      }
    }

    return {
      all: activeTotal,
      overdue: overdueCount,
      today: todayCount,
      upcoming: upcomingCount,
      no_date: noDateCount,
      completed: completedCount,
      total: tasks.length,
    };
  }, [tasks, todayStr]);

  // Filtrage selon onglet, activité, priorité et texte de recherche
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isDone = t.status === "done";
      const isCancelled = t.status === "cancelled";

      // 1. Filtrage par onglet
      if (activeTab === "all" && (isDone || isCancelled)) return false;
      if (activeTab === "overdue") {
        if (isDone || isCancelled || !t.due_date || t.due_date >= todayStr) return false;
      }
      if (activeTab === "today") {
        if (isDone || isCancelled || !t.due_date || t.due_date !== todayStr) return false;
      }
      if (activeTab === "upcoming") {
        if (isDone || isCancelled || !t.due_date || t.due_date <= todayStr) return false;
      }
      if (activeTab === "no_date") {
        if (isDone || isCancelled || Boolean(t.due_date)) return false;
      }
      if (activeTab === "completed") {
        if (!isDone && !isCancelled) return false;
      }

      // 2. Filtrage par activité
      if (selectedActivity !== "all") {
        if (selectedActivity === "unassigned" && t.activity_id !== null) return false;
        if (selectedActivity !== "unassigned" && t.activity_id !== selectedActivity) return false;
      }

      // 3. Filtrage par priorité
      if (selectedPriority !== "all" && t.priority !== selectedPriority) {
        return false;
      }

      // 4. Recherche texte
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesActivity = t.activity?.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesActivity) return false;
      }

      return true;
    });
  }, [tasks, activeTab, selectedActivity, selectedPriority, searchQuery, todayStr]);

  const tabs: { id: TaskTab; label: string; count: number; alert?: boolean }[] = [
    { id: "all", label: "À faire", count: counts.all },
    { id: "overdue", label: "En retard", count: counts.overdue, alert: counts.overdue > 0 },
    { id: "today", label: "Aujourd'hui", count: counts.today },
    { id: "upcoming", label: "À venir", count: counts.upcoming },
    { id: "no_date", label: "Sans date", count: counts.no_date },
    { id: "completed", label: "Terminées", count: counts.completed },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Tâches & Actions</h1>
          <p className="text-sm text-ink-500">
            {counts.all} active{counts.all > 1 ? "s" : ""}
            {counts.overdue > 0 ? (
              <span className="ml-2 font-medium text-danger">
                • {counts.overdue} en retard
              </span>
            ) : null}
            {counts.today > 0 ? (
              <span className="ml-2 font-medium text-warning">
                • {counts.today} aujourd'hui
              </span>
            ) : null}
          </p>
        </div>

        <Link href="/tasks/new" className={buttonClasses("primary", "md")}>
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle tâche
        </Link>
      </div>

      {/* Onglets de navigation temporelle */}
      <div className="border-b border-ink-200">
        <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-signal text-signal"
                    : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive
                      ? tab.alert
                        ? "bg-danger-soft text-danger"
                        : "bg-signal-soft text-signal"
                      : tab.alert
                      ? "bg-danger-soft text-danger"
                      : "bg-ink-100 text-ink-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Barre de filtres & recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Champ de recherche */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="w-full rounded-lg border border-ink-300 bg-canvas-raised px-3.5 py-2 pl-9 text-sm text-ink-950 placeholder-ink-400 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-ink-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-xs text-ink-400 hover:text-ink-700"
            >
              Effacer
            </button>
          ) : null}
        </div>

        {/* Filtre par Activité */}
        <select
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
          className="rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
        >
          <option value="all">Toutes les activités</option>
          <option value="unassigned">Tâches libres (sans activité)</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Filtre par Priorité */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="rounded-lg border border-ink-300 bg-canvas-raised px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
        >
          <option value="all">Toutes les priorités</option>
          <option value="urgent">Urgente</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
      </div>

      {/* Liste des tâches filtrées */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/50 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-ink-950">
            {activeTab === "overdue"
              ? "Aucune tâche en retard 🎉"
              : activeTab === "today"
              ? "Rien de planifié pour aujourd'hui"
              : activeTab === "completed"
              ? "Aucune tâche terminée pour l'instant"
              : "Aucune tâche trouvée"}
          </h3>
          <p className="mt-1 text-sm text-ink-500 max-w-sm mx-auto">
            {activeTab === "overdue"
              ? "Toutes vos tâches sont à jour. Continuez comme ça !"
              : activeTab === "today"
              ? "Vous pouvez vous concentrer sur vos activités ou planifier une tâche."
              : "Ajoutez une tâche pour organiser votre emploi du temps et vos livrables."}
          </p>
          <div className="mt-5">
            <Link href="/tasks/new" className={buttonClasses("primary", "sm")}>
              + Créer une tâche
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
