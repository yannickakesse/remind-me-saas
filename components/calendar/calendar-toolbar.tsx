"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Printer, Download, ChevronDown, Loader2, FileText, AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { CALENDAR_VIEWS, shiftAnchor, todayISODate, type CalendarView } from "@/lib/calendar/view-range";
import { TranslationKey } from "@/lib/i18n/types";

const VIEW_TRANSLATION_KEYS: Record<CalendarView, TranslationKey> = {
  day: "calendar.view_day",
  week: "calendar.view_week",
  month: "calendar.view_month",
  agenda: "calendar.view_agenda",
};

export function CalendarToolbar({
  view,
  anchorDate,
  timezone,
}: {
  view: CalendarView;
  anchorDate: string;
  timezone: string;
}) {
  const { locale, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const prev = shiftAnchor(view, anchorDate, timezone, -1);
  const next = shiftAnchor(view, anchorDate, timezone, 1);
  const today = todayISODate(timezone);

  const dt = DateTime.fromISO(anchorDate, { zone: timezone }).setLocale(locale || "fr");
  let label = "";
  if (view === "day") {
    label = dt.toFormat("cccc d MMMM yyyy");
  } else if (view === "month") {
    label = dt.toFormat("MMMM yyyy");
  } else if (view === "week") {
    label = `${t("calendar.view_week")} • ${dt.toFormat("d MMMM yyyy")}`;
  } else {
    label = `${t("calendar.view_agenda")} • ${dt.toFormat("d MMMM yyyy")}`;
  }

  // Fermeture du dropdown au clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Téléchargement direct du PDF avec protection anti double-clic
  async function handleDirectDownload() {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);
    setDropdownOpen(false);

    try {
      const monthSlug = anchorDate.slice(0, 7);
      const url = `/api/calendar/export?date=${encodeURIComponent(anchorDate)}&orientation=landscape&locale=${encodeURIComponent(locale || "fr")}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `RemindMe_Calendrier_${monthSlug}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Échec export PDF:", err);
      setExportError(t("calendar.export_error"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md border border-ink-200/90 dark:border-ink-800/90 shadow-xs relative">
      {/* Navigation précédente / aujourd'hui / suivante */}
      <div className="flex items-center gap-2 max-w-full flex-wrap">
        <Link
          href={`/calendar?view=${view}&date=${prev}`}
          className="rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-950 px-3 py-1.5 text-xs sm:text-sm font-bold text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
          aria-label={t("calendar.prev_period")}
        >
          ←
        </Link>
        <Link
          href={`/calendar?view=${view}&date=${today}`}
          className="rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-950 px-3 py-1.5 text-xs sm:text-sm font-bold text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
        >
          {t("calendar.today_btn")}
        </Link>
        <Link
          href={`/calendar?view=${view}&date=${next}`}
          className="rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-950 px-3 py-1.5 text-xs sm:text-sm font-bold text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
          aria-label={t("calendar.next_period")}
        >
          →
        </Link>
        <p className="ml-2 text-sm sm:text-base font-extrabold capitalize text-ink-950 dark:text-white truncate max-w-[200px] sm:max-w-none">
          {label}
        </p>
      </div>

      {/* Actions de droite : Vues + Bouton Exporter / Imprimer PDF */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Sélecteur de vues */}
        <div className="flex items-center gap-1.5 rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200/90 dark:border-ink-800/90 p-1 max-w-full overflow-x-auto no-scrollbar" data-tour="calendar-views">
          {CALENDAR_VIEWS.map((v) => (
            <Link
              key={v.value}
              href={`/calendar?view=${v.value}&date=${anchorDate}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold shrink-0 whitespace-nowrap transition-all ${
                v.value === view ? "bg-signal text-white shadow-xs" : "text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              {t(VIEW_TRANSLATION_KEYS[v.value])}
            </Link>
          ))}
        </div>

        {/* Bouton Exporter / Imprimer PDF A4 */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-75 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            data-tour="calendar-export-btn"
            title="Télécharger ou imprimer le calendrier en PDF A4"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span>{isExporting ? t("calendar.exporting") : t("calendar.export_pdf")}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Menu déroulant d'exportation */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider block">
                  Exportation PDF A4
                </span>
                <span className="text-[10px] text-slate-500">
                  {dt.toFormat("MMMM yyyy")} • Dimensions 210 × 297 mm
                </span>
              </div>

              <div className="py-1 space-y-1">
                {/* Option 1: Téléchargement direct du fichier binaire PDF */}
                <button
                  type="button"
                  onClick={handleDirectDownload}
                  disabled={isExporting}
                  className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left transition-colors cursor-pointer group"
                >
                  <Download className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {t("calendar.download_pdf")}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Fichier PDF autonome prêt pour impression ou partage
                    </div>
                  </div>
                </button>

                {/* Option 2: Ouvrir la vue imprimable A4 dans un nouvel onglet */}
                <Link
                  href={`/calendar/print?date=${anchorDate}&orientation=landscape`}
                  target="_blank"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
                >
                  <Printer className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {t("calendar.print_pdf")}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Aperçu plein écran &amp; boîte de dialogue d&apos;impression
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message d'erreur en cas d'échec de téléchargement */}
      {exportError && (
        <div className="w-full mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-xs font-bold hover:underline"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
