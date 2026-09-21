import type { BadgeTone } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  /** Petite précision sous la valeur (ex. "3 en attente"). */
  helper?: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  dataTour?: string;
}

const TONE_TEXT_CLASSES: Record<BadgeTone, string> = {
  neutral: "text-ink-950",
  positive: "text-positive",
  warning: "text-amber-600 dark:text-gold-light",
  danger: "text-danger",
  info: "text-info",
  signal: "text-signal",
};

/**
 * Carte de statistique du dashboard & finances (§28).
 * Design haut de gamme avec touches subtiles et typographie équilibrée.
 */
export function StatCard({ label, value, helper, tone = "neutral", icon: Icon, dataTour }: StatCardProps) {
  return (
    <div
      data-tour={dataTour}
      className="rounded-2xl border border-ink-200 bg-canvas-raised p-4 sm:p-5 min-w-0 w-full shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ink-500 truncate">
            {label}
          </p>
          {Icon ? (
            <div className="p-1.5 rounded-lg bg-canvas border border-ink-100 group-hover:border-gold/30 text-ink-500 group-hover:text-signal transition-colors">
              <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          ) : null}
        </div>
        <p
          className={`mt-1.5 text-base sm:text-xl md:text-2xl font-extrabold tracking-tight truncate ${TONE_TEXT_CLASSES[tone]}`}
          title={value}
        >
          {value}
        </p>
      </div>
      {helper ? (
        <p className="mt-2 text-[10px] sm:text-xs text-ink-500 truncate">{helper}</p>
      ) : null}
    </div>
  );
}
