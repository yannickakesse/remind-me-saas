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
    <div className="rounded-lg border border-ink-100 bg-canvas-raised px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${TONE_TEXT_CLASSES[tone]}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs text-ink-500">{helper}</p> : null}
    </div>
  );
}
