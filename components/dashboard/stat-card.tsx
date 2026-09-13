import type { BadgeTone } from "@/components/ui/badge";

interface StatCardProps {
  label: string;
  value: string;
  /** Petite précision sous la valeur (ex. "3 en attente"). */
  helper?: string;
  tone?: BadgeTone;
}

const TONE_TEXT_CLASSES: Record<BadgeTone, string> = {
  neutral: "text-ink-950",
  positive: "text-positive",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  signal: "text-signal",
};

/**
 * Carte de statistique du dashboard (§28 — Income/Expenses/Net/Tasks...).
 * Volontairement sobre : la hiérarchie vient de la typo, pas d'ombres ou de
 * gradients (§3/§159 du prompt maître — "premium but simple").
 */
export function StatCard({ label, value, helper, tone = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-ink-100 bg-canvas-raised p-3.5 sm:p-5 min-w-0 w-full shadow-xs flex flex-col justify-between">
      <div>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ink-500 truncate">
          {label}
        </p>
        <p
          className={`mt-1 text-base sm:text-xl md:text-2xl font-bold tracking-tight truncate ${TONE_TEXT_CLASSES[tone]}`}
          title={value}
        >
          {value}
        </p>
      </div>
      {helper ? (
        <p className="mt-1 text-[10px] sm:text-xs text-ink-500 truncate">{helper}</p>
      ) : null}
    </div>
  );
}
