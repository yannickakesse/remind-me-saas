"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import {
  Calendar,
  Clock,
  CheckSquare,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { eventStatusLabel, getContrastTextColor } from "@/lib/validation/calendar";
import { TASK_PRIORITY_STYLES, taskPriorityLabel } from "@/lib/validation/tasks";
import { t } from "@/lib/i18n/format";
import type { SupportedLocale } from "@/lib/i18n/types";

interface TodayFocusProps {
  todayEvents: Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    status: string;
    activity?: { name: string; color?: string | null } | null;
  }>;
  urgentTasks: Array<{
    id: string;
    title: string;
    priority: "urgent" | "high" | "normal" | "low";
    due_date: string;
    status: string;
  }>;
  timezone: string;
  locale: SupportedLocale;
  todayIso: string;
}

export function TodayFocus({
  todayEvents,
  urgentTasks,
  timezone,
  locale,
  todayIso,
}: TodayFocusProps) {
  const now = DateTime.now().setZone(timezone);
  const nowIso = now.toISO()!;

  // Trouver la prochaine séance imminente ou en cours
  const nextEventId = todayEvents.find(
    (e) => e.status !== "cancelled" && e.ends_at >= nowIso
  )?.id;

  const eventCount = todayEvents.length;
  const taskCount = urgentTasks.length;

  return (
    <div
      className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md p-4 sm:p-6 shadow-sm space-y-4"
      data-tour="dashboard-today"
    >
      {/* En-tête de la journée */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ink-100 dark:border-ink-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-signal/10 text-signal">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-900 dark:text-ink-100">
              Focus de la journée
            </h2>
            <p className="text-[11px] text-ink-500 capitalize">
              {now.setLocale(locale).toFormat("cccc d MMMM yyyy")}
            </p>
          </div>
        </div>

        {/* Badge récapitulatif */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300">
            {eventCount === 0 && taskCount === 0
              ? "Journée libre"
              : `${eventCount} séance${eventCount > 1 ? "s" : ""} • ${taskCount} tâche${
                  taskCount > 1 ? "s" : ""
                }`}
          </span>
          <Link
            href="/calendar"
            className="text-xs font-semibold text-signal hover:underline flex items-center gap-0.5 ml-1"
          >
            {t("dashboard.see_all", locale)} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Grille 2 volets : Séances d'un côté, Tâches de l'autre */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Volet 1 : Séances du jour */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-signal" />
              <span>{t("dashboard.today_events", locale)}</span>
              <span className="text-ink-400 font-normal">({eventCount})</span>
            </h3>
            <Link
              href="/calendar"
              className="text-[11px] font-semibold text-signal hover:underline"
            >
              + Planning
            </Link>
          </div>

          {eventCount === 0 ? (
            <div className="p-4 sm:p-5 text-center text-xs text-ink-500 bg-canvas/60 dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 space-y-2">
              <p>{t("dashboard.no_events_today", locale)}</p>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-signal hover:underline"
              >
                <Plus className="w-3 h-3" /> Planifier un créneau
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todayEvents.map((event) => {
                const color = event.activity?.color ?? "#1E3A5F";
                const textColor = getContrastTextColor(color);
                const start = DateTime.fromISO(event.starts_at, { zone: timezone }).toFormat("HH:mm");
                const end = DateTime.fromISO(event.ends_at, { zone: timezone }).toFormat("HH:mm");
                const isNext = event.id === nextEventId;

                return (
                  <Link
                    key={event.id}
                    href={`/calendar/${event.id}`}
                    className={`block p-3 rounded-2xl border transition-all shadow-2xs group relative ${
                      isNext
                        ? "border-signal/50 bg-signal-soft/10 dark:bg-signal/10 hover:border-signal"
                        : "border-ink-100 dark:border-ink-800/80 bg-canvas dark:bg-ink-950 hover:border-ink-300 dark:hover:border-ink-700"
                    }`}
                  >
                    {isNext && (
                      <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-signal text-white shadow-2xs">
                        Prochaine
                      </span>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-bold shadow-2xs shrink-0"
                          style={{ backgroundColor: color, color: textColor }}
                        >
                          {start}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                            {event.title}
                          </div>
                          <div className="text-[10px] text-ink-500 truncate">
                            {start} – {end}
                            {event.activity?.name ? ` • ${event.activity.name}` : ""}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-ink-400 shrink-0 ml-1">
                        {eventStatusLabel(event.status)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Volet 2 : Tâches du jour & prioritaires */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t("dashboard.urgent_tasks", locale)}</span>
              <span className="text-ink-400 font-normal">({taskCount})</span>
            </h3>
            <Link
              href="/tasks/new"
              className="text-[11px] font-semibold text-signal hover:underline"
            >
              + {t("tasks.new_task", locale)}
            </Link>
          </div>

          {taskCount === 0 ? (
            <div className="p-4 sm:p-5 text-center text-xs text-ink-500 bg-canvas/60 dark:bg-ink-950/60 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 space-y-2">
              <div className="flex justify-center text-positive">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p>{t("tasks.empty_today", locale)}</p>
              <Link
                href="/tasks/new"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-signal hover:underline"
              >
                <Plus className="w-3 h-3" /> Ajouter une tâche
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentTasks.map((task) => {
                const isOverdue = task.due_date < todayIso;
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}/edit`}
                    className="flex items-center justify-between p-3 rounded-2xl border border-ink-100 dark:border-ink-800/80 bg-canvas dark:bg-ink-950 hover:border-ink-300 dark:hover:border-ink-700 transition-colors shadow-2xs group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-xs text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                        {task.title}
                      </div>
                      <div className="text-[10px] text-ink-500 mt-0.5">
                        {isOverdue ? (
                          <span className="text-danger font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> En retard • Échéance : {task.due_date}
                          </span>
                        ) : (
                          <span>Échéance : Aujourd&apos;hui</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${TASK_PRIORITY_STYLES[task.priority]}`}
                    >
                      {taskPriorityLabel(task.priority)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
