import type { BadgeTone } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  /** Petite précision sous la valeur (ex. "Charges effectives"). */
  helper?: string;
  badge?: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  dataTour?: string;
}

const TONE_TEXT_CLASSES: Record<BadgeTone, string> = {
  neutral: "text-ink-950 dark:text-white",
  positive: "text-positive dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-danger dark:text-rose-400",
  info: "text-info dark:text-sky-400",
  signal: "text-signal dark:text-amber-400",
};

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300",
  positive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",
  signal: "bg-signal-soft/50 text-signal dark:bg-signal/20 dark:text-amber-300 border-signal/30",
};

/**
 * Carte de statistique du dashboard & finances.
 * Design Atelier Moderne : sobre, typographie soignée, chiffres lisibles en mono.
 */
export function StatCard({
  label,
  value,
  helper,
  badge,
  tone = "neutral",
  icon: Icon,
  dataTour,
}: StatCardProps) {
  return (
    <div
      data-tour={dataTour}
      className="rounded-2xl sm:rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 sm:p-5 min-w-0 w-full shadow-2xs hover:border-signal/40 transition-all flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400 truncate">
            {label}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {badge && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${BADGE_TONE_CLASSES[tone]}`}
              >
                {badge}
              </span>
            )}
            {Icon ? (
              <div className="p-1 rounded-md bg-canvas dark:bg-ink-950 text-ink-400 group-hover:text-signal transition-colors">
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
            ) : null}
          </div>
        </div>
        <p
          className={`text-base sm:text-xl lg:text-2xl font-mono font-bold tracking-tight truncate ${TONE_TEXT_CLASSES[tone]}`}
          title={value}
        >
          {value}
        </p>
      </div>
      {helper ? (
        <p className="mt-2 text-[10px] sm:text-xs text-ink-500 dark:text-ink-400 truncate border-t border-ink-100/60 dark:border-ink-800/60 pt-1.5">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
