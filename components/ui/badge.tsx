export type BadgeTone = "neutral" | "positive" | "warning" | "danger" | "info" | "signal";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-ink-300 bg-ink-100 text-ink-700",
  positive: "border-positive/30 bg-positive-soft text-positive",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-info/30 bg-info-soft text-info",
  signal: "border-signal/30 bg-signal-soft text-signal",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

/** Pastille de statut générique — remplace les `<span>` de styles ad hoc dupliqués page par page. */
export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
