"use client";


import { useLanguage } from "@/components/i18n/language-provider";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  Calendar,
  Clock,
  CheckSquare,
  ArrowRight,
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
  const { tr } = useLanguage();
  const now = DateTime.now().setZone(timezone);
  const nowIso = now.toISO()!;

  // Trouver la prochaine séance imminente ou en cours
  const nextEventId = todayEvents.find(
    (e) => e.status !== "cancelled" && e.ends_at >= nowIso
  )?.id;

  const eventCount = todayEvents.length;
  const taskCount = urgentTasks.length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. FOCUS DE LA JOURNÉE + PROGRAMME DU JOUR */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-6 shadow-xs space-y-4" data-tour="dashboard-today">
        <div className="absolute top-0 right-0 w-64 h-64 bg-signal/5 dark:bg-signal/10 rounded-full blur-3xl pointer-events-none" />

        {/* En-tête centré (la date est déjà affichée en haut de la page) */}
        <div className="relative z-10 flex flex-col items-center gap-2.5 pb-4 border-b border-ink-200/70 dark:border-white/5 text-center">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-signal">{tr("Focus de la journée")}</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-ink-100/80 dark:bg-white/5 text-ink-700 dark:text-ink-300 border border-ink-200/50 dark:border-white/5">
              {eventCount === 0 && taskCount === 0
                ? tr("Journée libre")
                : `${eventCount} séance${eventCount > 1 ? "s" : ""} • ${taskCount} tâche${taskCount > 1 ? "s" : ""}`}
            </span>
            <Link href="/calendar" className="text-xs font-semibold text-signal hover:underline inline-flex items-center gap-1 group">
              <span>{tr("Voir")}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Programme du jour */}
        <div className="relative z-10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-signal" />
            <span>{t("dashboard.today_events", locale)}</span>
            <span className="text-ink-400 font-normal">({eventCount})</span>
          </h3>

          {eventCount === 0 ? (
            <div className="p-5 sm:p-6 text-center text-xs text-ink-500 bg-canvas/60 dark:bg-slate-950/40 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 space-y-2.5">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-signal/10 text-signal flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="font-medium text-ink-700 dark:text-ink-300">{t("dashboard.no_events_today", locale)}</p>
            </div>
          ) : (
          <div className="space-y-2.5">
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
                  className={`block p-3.5 rounded-2xl border transition-all duration-200 shadow-2xs hover:-translate-y-0.5 group relative overflow-hidden ${
                    isNext
                      ? "border-signal/60 bg-signal-soft/15 dark:bg-signal/10 hover:border-signal shadow-[0_4px_20px_rgba(217,119,6,0.12)]"
                      : "border-ink-100/90 dark:border-white/5 bg-canvas dark:bg-slate-950/70 hover:border-ink-300 dark:hover:border-white/15"
                  }`}
                >
                  {/* Bande latérale thématique basée sur la couleur de l'activité */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                    style={{ backgroundColor: color }}
                  />

                  {isNext && (
                    <span className="absolute top-2.5 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-signal text-white shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {tr("Prochaine")}</span>
                  )}

                  <div className="flex items-center justify-between gap-2 pl-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold shadow-2xs shrink-0"
                        style={{ backgroundColor: color, color: textColor }}
                      >
                        {start}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                          {event.title}
                        </div>
                        <div className="text-[11px] text-ink-500 truncate mt-0.5">
                          {start} – {end}
                          {event.activity?.name ? ` • ${event.activity.name}` : ""}
                        </div>
                      </div>
                    </div>
                    {/* Le badge « Prochaine » remplace le statut pour ne pas se superposer */}
                    {!isNext && (
                      <span className="text-[11px] font-medium text-ink-400 shrink-0 ml-1">
                        {tr(eventStatusLabel(event.status))}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          )}
        </div>
      </section>

      {/* 2. TÂCHES URGENTES : section distincte, juste sous le programme */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-6 shadow-xs space-y-4" data-tour="dashboard-urgent-tasks">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 flex items-center justify-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>{t("dashboard.urgent_tasks", locale)}</span>
          <span className="text-ink-400 font-normal">({taskCount})</span>
        </h3>

        {taskCount === 0 ? (
          <div className="p-5 sm:p-6 text-center text-xs text-ink-500 bg-canvas/60 dark:bg-slate-950/40 rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 space-y-2.5">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="font-medium text-ink-700 dark:text-ink-300">{t("tasks.empty_today", locale)}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {urgentTasks.map((task) => {
              const isOverdue = task.due_date < todayIso;
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}/edit`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-ink-100/90 dark:border-white/5 bg-canvas dark:bg-slate-950/70 hover:border-ink-300 dark:hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5 shadow-2xs group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-xs sm:text-sm text-ink-950 dark:text-white truncate group-hover:text-signal transition-colors">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-ink-500 mt-0.5">
                      {isOverdue ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {tr("En retard • Échéance :")}{" "}{task.due_date}
                        </span>
                      ) : (
                        <span>{tr("Échéance : Aujourd'hui")}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 shadow-2xs ${TASK_PRIORITY_STYLES[task.priority]}`}
                  >
                    {tr(taskPriorityLabel(task.priority))}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
