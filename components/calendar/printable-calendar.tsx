"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  Printer,
  ArrowLeft,
  Download,
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import type { CalendarPdfEvent, CalendarPdfActivity } from "@/lib/calendar/pdf-generator";

interface PrintableCalendarProps {
  user: {
    fullName: string | null;
    email?: string | null;
    planName: string;
  };
  period: {
    monthLabel: string;
    anchorDate: string;
    generatedAtFormatted: string;
    documentRef: string;
    timezone: string;
  };
  events: CalendarPdfEvent[];
  activities: CalendarPdfActivity[];
  initialOrientation?: "landscape" | "portrait";
}

export function PrintableCalendar({
  user,
  period,
  events,
  activities,
  initialOrientation = "landscape",
}: PrintableCalendarProps) {
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(initialOrientation);
  const [isDownloading, setIsDownloading] = useState(false);

  // Met à jour dynamiquement le titre du document pour que l'enregistrement PDF du navigateur
  // propose automatiquement le nom de fichier officiel : RemindMe_Calendrier_YYYY-MM.pdf
  useEffect(() => {
    const monthSlug = period.anchorDate.slice(0, 7);
    const previousTitle = document.title;
    document.title = `RemindMe_Calendrier_${monthSlug}`;
    return () => {
      document.title = previousTitle;
    };
  }, [period.anchorDate]);

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  // Calcul des jours de la grille
  const anchorDt = DateTime.fromISO(period.anchorDate, { zone: period.timezone });
  const currentMonthDt = anchorDt.isValid ? anchorDt.startOf("month") : DateTime.now().setZone(period.timezone).startOf("month");
  const gridStart = currentMonthDt.startOf("week");
  const gridEnd = currentMonthDt.endOf("month").endOf("week");
  const todayISO = DateTime.now().setZone(period.timezone).toISODate();

  const days: DateTime[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }

  // Événements indexés par jour YYYY-MM-DD
  const eventsByDay = new Map<string, CalendarPdfEvent[]>();
  let totalHours = 0;
  let scheduledExpensesCount = 0;

  for (const ev of events) {
    const sDt = DateTime.fromISO(ev.starts_at, { zone: period.timezone });
    if (sDt.isValid) {
      const iso = sDt.toISODate()!;
      if (!eventsByDay.has(iso)) eventsByDay.set(iso, []);
      eventsByDay.get(iso)!.push(ev);

      if (ev.is_scheduled_expense) {
        scheduledExpensesCount++;
      } else {
        const eDt = DateTime.fromISO(ev.ends_at, { zone: period.timezone });
        if (eDt.isValid && eDt > sDt) {
          totalHours += eDt.diff(sDt, "hours").hours;
        }
      }
    }
  }

  const sampleWeekDays = days.slice(0, 7);
  const weekdayLabels = sampleWeekDays.map((d) => d.setLocale("fr").toFormat("cccc"));

  const isLandscape = orientation === "landscape";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 sm:px-6 print:p-0 print:m-0 print:min-h-0 print:bg-white text-slate-900">
      {/* Dynamic CSS Print Page rules for selected orientation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${isLandscape ? "A4 landscape" : "A4 portrait"} !important;
                margin: ${isLandscape ? "8mm 10mm" : "10mm 12mm"} !important;
              }
              body {
                background: #ffffff !important;
                color: #0f172a !important;
                font-size: 9.5pt !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {/* Action Bar (Hidden in Print) */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-3 print:hidden">
        <Link
          href={`/calendar?date=${period.anchorDate}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au calendrier
        </Link>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Orientation switch */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-1 shadow-sm text-xs font-bold">
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                isLandscape
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              Paysage (A4 recommandé)
            </button>
            <button
              type="button"
              onClick={() => setOrientation("portrait")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                !isLandscape
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              Portrait (A4)
            </button>
          </div>

          {/* Direct Binary PDF Download */}
          <a
            href={`/api/calendar/export?date=${period.anchorDate}&orientation=${orientation}&locale=fr`}
            download={`RemindMe_Calendrier_${period.anchorDate.slice(0, 7)}.pdf`}
            onClick={() => {
              setIsDownloading(true);
              setTimeout(() => setIsDownloading(false), 2500);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-600" />
            {isDownloading ? "Téléchargement..." : "Télécharger le PDF"}
          </a>

          {/* Browser Print / Native PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimer / Enregistrer en PDF (A4)
          </button>
        </div>
      </div>

      {/* Main Document (A4 format ultra-compact & élégant) */}
      <div
        className={`mx-auto bg-white p-5 sm:p-8 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full space-y-4 print:space-y-2 text-slate-900 transition-all ${
          isLandscape ? "max-w-6xl" : "max-w-4xl"
        }`}
      >
        {/* En-tête officiel Remind Me */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b-2 border-slate-900 gap-3 print:pb-2">
          <div className="flex items-center gap-3">
            <RemindMeLogo size="md" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">REMIND ME</h1>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                  Calendrier &amp; Planning Officiel
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Planning synchronisé des activités, rendez-vous et échéances programmées
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-0.5 text-xs">
            <div className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              {period.monthLabel}
            </div>
            <div className="text-[10.5px] font-mono text-slate-500">
              Réf : <strong>{period.documentRef}</strong>
            </div>
            <div className="text-[10px] text-slate-500">
              Émis le : {period.generatedAtFormatted}
            </div>
          </div>
        </div>

        {/* Info Titulaire & Paramètres */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 border-b border-slate-200 text-xs print:py-1">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px]">Titulaire du calendrier</span>
            <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{user.fullName || "Utilisateur Remind Me"}</p>
            <p className="text-slate-600 text-[11px] truncate">{user.email || ""}</p>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px]">Fuseau horaire certifié</span>
            <p className="font-bold text-slate-900 text-xs">{period.timezone}</p>
            <p className="text-slate-600 text-[10.5px]">Calcul UTC sans décalage</p>
          </div>
          <div className="text-right sm:text-right col-span-2 sm:col-span-1">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px]">Volume planifié</span>
            <p className="font-extrabold text-amber-700 text-xs sm:text-sm">
              {events.length} séances ({Math.round(totalHours)}h)
            </p>
            <p className="text-slate-600 text-[10.5px]">{scheduledExpensesCount} dépenses programmées</p>
          </div>
        </div>

        {/* Grille Mensuelle A4 */}
        <div className="w-full border border-slate-300 rounded-xl overflow-hidden print:rounded-none">
          {/* Ligne d'en-tête des jours de la semaine */}
          <div className="grid grid-cols-7 bg-slate-900 text-white font-bold text-[10.5px] print:text-[9.5px] uppercase tracking-wider text-center divide-x divide-slate-800">
            {weekdayLabels.map((name) => (
              <div key={name} className="py-1.5 px-1 truncate">
                {name}
              </div>
            ))}
          </div>

          {/* Grille des cellules des jours */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-white">
            {days.map((day) => {
              const iso = day.toISODate()!;
              const isCurrentMonth = day.month === currentMonthDt.month;
              const isToday = iso === todayISO;
              const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) =>
                a.starts_at.localeCompare(b.starts_at)
              );

              return (
                <div
                  key={iso}
                  className={`p-1.5 min-h-[92px] sm:min-h-[105px] print:min-h-[88px] flex flex-col justify-between print-avoid-break transition-colors ${
                    isCurrentMonth ? "bg-white" : "bg-slate-50/70 text-slate-400"
                  }`}
                >
                  {/* Numéro du jour */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold ${
                        isToday
                          ? "bg-amber-600 text-white shadow-xs"
                          : isCurrentMonth
                          ? "text-slate-900"
                          : "text-slate-400"
                      }`}
                    >
                      {day.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-bold text-slate-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Liste des séances / événements de la journée */}
                  <div className="space-y-1 flex-1">
                    {dayEvents.map((ev) => {
                      const sDt = DateTime.fromISO(ev.starts_at, { zone: period.timezone });
                      const eDt = DateTime.fromISO(ev.ends_at, { zone: period.timezone });
                      const timeStr = sDt.isValid
                        ? eDt.isValid && eDt.diff(sDt, "hours").hours < 24
                          ? `${sDt.toFormat("HH:mm")}-${eDt.toFormat("HH:mm")}`
                          : sDt.toFormat("HH:mm")
                        : "";

                      return (
                        <div
                          key={ev.id}
                          className={`rounded px-1.5 py-0.5 text-[9.5px] print:text-[8.5px] border leading-tight flex items-start gap-1 ${
                            ev.is_scheduled_expense
                              ? "bg-amber-50/90 border-amber-300 text-amber-950 font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                          style={{
                            borderLeftColor: ev.activityColor || "#3B82F6",
                            borderLeftWidth: "3px",
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 font-bold text-[9px] text-slate-600">
                              {timeStr && <span className="font-mono">{timeStr}</span>}
                              {ev.hasConflict && (
                                <span className="inline-flex items-center text-rose-600 font-extrabold" title="Conflit d'horaire">
                                  <AlertTriangle className="w-2.5 h-2.5 inline" />
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-900 break-words line-clamp-2">
                              {ev.title}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Légende des Activités & Certification */}
        <div className="pt-3 border-t-2 border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:pt-2">
          {/* Légende des couleurs */}
          <div className="space-y-1 max-w-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-600" /> Légende des activités
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-700">
              {activities.map((act) => (
                <div key={act.id} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: act.color || "#3B82F6" }}
                  />
                  <span className="font-medium truncate max-w-[120px]">{act.name}</span>
                </div>
              ))}
              <div className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                <span className="font-medium text-amber-800">Dépense programmée</span>
              </div>
            </div>
          </div>

          {/* Sceau Officiel de Certification Remind Me */}
          <div className="p-2 rounded-xl border border-dashed border-amber-600/40 bg-amber-50/30 text-center min-w-[160px] shrink-0 print:py-1">
            <div className="text-[8.5px] font-bold uppercase text-amber-900">
              Planning Officiel
            </div>
            <div className="font-serif italic text-amber-800 text-[11px] font-bold">
              Remind Me Verified
            </div>
            <div className="inline-flex items-center gap-1 text-[8.5px] text-emerald-700 font-bold">
              <CheckCircle2 className="w-2.5 h-2.5" /> Conforme A4 &amp; Fuseaux
            </div>
          </div>
        </div>

        {/* Pied de page du document */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
          <div>
            Remind Me • Document de planification certifié • Usage personnel &amp; professionnel
          </div>
          <div>
            Page 1 / 1
          </div>
        </div>
      </div>
    </div>
  );
}
