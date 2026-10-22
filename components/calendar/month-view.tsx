"use client";

import { useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { EventPill } from "./event-pill";
import { Clock, Calendar, ArrowRight, AlertTriangle, Plus } from "lucide-react";
import { eventStatusLabel, getContrastTextColor } from "@/lib/validation/calendar";
import type { CalendarEventView } from "./types";

const MAX_VISIBLE_PER_DAY = 3;

export function MonthView({
  anchorDate,
  timezone,
  events,
  conflictIds,
}: {
  anchorDate: string;
  timezone: string;
  events: CalendarEventView[];
  conflictIds: Set<string>;
}) {
  const anchor = DateTime.fromISO(anchorDate, { zone: timezone });
  const gridStart = anchor.startOf("month").startOf("week");
  const gridEnd = anchor.endOf("month").endOf("week");
  const today = DateTime.now().setZone(timezone).toISODate();

  // Date sélectionnée sur mobile (par défaut aujourd'hui si dans le mois, sinon le 1er du mois ou anchorDate)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (today && today.startsWith(anchor.toFormat("yyyy-MM"))) {
      return today;
    }
    return anchorDate;
  });

  const days: DateTime[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }

  const eventsByDay = new Map<string, CalendarEventView[]>();
  for (const event of events) {
    const day = DateTime.fromISO(event.starts_at, { zone: timezone }).toISODate()!;
    if (!eventsByDay.has(day)) eventsByDay.set(day, []);
    eventsByDay.get(day)!.push(event);
  }

  const weekdayLabels = days.slice(0, 7).map((d) => d.setLocale("fr").toFormat("ccc"));

  // Événements du jour sélectionné (pour la vue mobile sous la grille)
  const selectedDayEvents = (eventsByDay.get(selectedDate) ?? []).sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at)
  );
  const selectedDayObj = DateTime.fromISO(selectedDate, { zone: timezone }).setLocale("fr");
  const selectedDayLabel =
    selectedDayObj.isValid
      ? selectedDayObj.toFormat("cccc d MMMM yyyy")
      : selectedDate;

  return (
    <div className="space-y-4">
      {/* Grille mensuelle 100% responsive sans débordement horizontal */}
      <div className="w-full rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md shadow-sm p-1.5 sm:p-3 overflow-hidden">
        {/* En-tête des jours de la semaine (Lun..Dim) */}
        <div className="grid grid-cols-7 border-b border-ink-200/80 dark:border-ink-800/80 bg-canvas/80 dark:bg-ink-950/80 rounded-2xl mb-1">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-400 capitalize"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grille des cellules mensuelles */}
        <div className="grid grid-cols-7 rounded-2xl overflow-hidden border border-ink-200/80 dark:border-ink-800/80">
          {days.map((day) => {
            const iso = day.toISODate()!;
            const isCurrentMonth = day.month === anchor.month;
            const isToday = iso === today;
            const isSelected = iso === selectedDate;
            const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) =>
              a.starts_at.localeCompare(b.starts_at)
            );
            const overflow = dayEvents.length - MAX_VISIBLE_PER_DAY;

            return (
              <div
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`min-h-[50px] sm:min-h-[115px] border-b border-r border-ink-200/70 dark:border-ink-800/70 p-1 sm:p-2 last:border-r-0 cursor-pointer transition-all ${
                  isCurrentMonth
                    ? isSelected
                      ? "bg-signal-soft/30 dark:bg-signal/15 sm:bg-canvas-raised sm:dark:bg-slate-900"
                      : "bg-canvas-raised dark:bg-slate-900 hover:bg-ink-100/50 dark:hover:bg-ink-800/40"
                    : "bg-canvas/50 dark:bg-ink-950/40 opacity-60"
                }`}
              >
                {/* Numéro du jour */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-bold transition-transform ${
                      isToday
                        ? "bg-signal font-extrabold text-white shadow-xs"
                        : isSelected
                        ? "bg-ink-900 text-white dark:bg-white dark:text-ink-950 font-extrabold sm:bg-transparent sm:text-ink-950 sm:dark:text-white"
                        : isCurrentMonth
                        ? "text-ink-950 dark:text-white hover:text-signal"
                        : "text-ink-400 dark:text-ink-600"
                    }`}
                  >
                    {day.day}
                  </span>

                  {/* Indicateur de conflits discret */}
                  {dayEvents.some((e) => conflictIds.has(e.id)) ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" title="Conflit horaire sur ce jour" />
                  ) : null}
                </div>

                {/* VERSION MOBILE (< sm) : Pastilles / Indicateurs discrets de couleur */}
                <div className="mt-1 flex sm:hidden items-center justify-center gap-0.5 flex-wrap min-h-[14px]">
                  {dayEvents.slice(0, 3).map((event) => {
                    const color = event.is_scheduled_expense
                      ? "#D97706"
                      : event.activity?.color ?? "#1E3A5F";
                    return (
                      <span
                        key={event.id}
                        className="h-1.5 w-1.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: color }}
                        title={event.title}
                      />
                    );
                  })}
                  {dayEvents.length > 3 ? (
                    <span className="text-[9px] font-bold text-signal leading-none">
                      +
                    </span>
                  ) : null}
                </div>

                {/* VERSION DESKTOP (>= sm) : Pilules complètes d'événements */}
                <div className="hidden sm:flex flex-col gap-1.5 mt-1.5">
                  {dayEvents.slice(0, MAX_VISIBLE_PER_DAY).map((event) => (
                    <EventPill
                      key={event.id}
                      event={event}
                      timezone={timezone}
                      hasConflict={conflictIds.has(event.id)}
                    />
                  ))}
                  {overflow > 0 ? (
                    <Link
                      href={`/calendar?view=day&date=${iso}`}
                      className="px-1 text-[11px] font-bold text-signal hover:underline"
                    >
                      +{overflow} de plus
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VOLET MOBILE : DÉTAIL DES ÉVÉNEMENTS DU JOUR SÉLECTIONNÉ (Visible uniquement sur mobile < sm) */}
      <div className="block sm:hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-ink-100 dark:border-ink-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-signal" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 dark:text-white capitalize">
              {selectedDayLabel}
            </h3>
          </div>
          <Link
            href={`/calendar?view=day&date=${selectedDate}`}
            className="text-xs font-semibold text-signal hover:underline flex items-center gap-0.5"
          >
            Vue jour <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-500 space-y-2">
            <p>Aucun événement prévu pour cette date.</p>
            <Link
              href="/activities/new"
              className="inline-flex items-center gap-1 text-xs font-bold text-signal hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Planifier une activité
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((event) => {
              const start = DateTime.fromISO(event.starts_at, { zone: timezone }).toFormat("HH:mm");
              const end = DateTime.fromISO(event.ends_at, { zone: timezone }).toFormat("HH:mm");
              const color = event.is_scheduled_expense
                ? "#D97706"
                : event.activity?.color ?? "#1E3A5F";
              const textColor = getContrastTextColor(color);
              const hasConflict = conflictIds.has(event.id);

              return (
                <Link
                  key={event.id}
                  href={`/calendar/${event.id}`}
                  className={`block p-3 rounded-2xl border transition-all shadow-2xs group ${
                    hasConflict
                      ? "border-danger/60 bg-danger-soft/10 dark:bg-danger/10"
                      : "border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 hover:border-ink-300"
                  }`}
                >
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
                    <div className="flex items-center gap-1 shrink-0">
                      {hasConflict ? (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger text-white">
                          <AlertTriangle className="w-3 h-3" /> Conflit
                        </span>
                      ) : null}
                      <span className="text-[10px] font-medium text-ink-400">
                        {eventStatusLabel(event.status)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
