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
  trend?: string;
}

const TONE_STYLES: Record<
  BadgeTone,
  {
    text: string;
    badge: string;
    iconBg: string;
    iconText: string;
    glow: string;
    borderHover: string;
  }
> = {
  neutral: {
    text: "text-ink-950 dark:text-white",
    badge: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300 border-ink-200/60 dark:border-ink-700/60",
    iconBg: "bg-ink-100 dark:bg-ink-800/80",
    iconText: "text-ink-600 dark:text-ink-300",
    glow: "group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:group-hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)]",
    borderHover: "hover:border-ink-300 dark:hover:border-ink-600",
  },
  positive: {
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconText: "text-emerald-600 dark:text-emerald-400",
    glow: "group-hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)]",
    borderHover: "hover:border-emerald-500/40 dark:hover:border-emerald-500/40",
  },
  warning: {
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconText: "text-amber-600 dark:text-amber-400",
    glow: "group-hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]",
    borderHover: "hover:border-amber-500/40 dark:hover:border-amber-500/40",
  },
  danger: {
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60",
    iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
    iconText: "text-rose-600 dark:text-rose-400",
    glow: "group-hover:shadow-[0_8px_30px_rgba(244,63,94,0.12)]",
    borderHover: "hover:border-rose-500/40 dark:hover:border-rose-500/40",
  },
  info: {
    text: "text-sky-600 dark:text-sky-400",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",
    iconBg: "bg-sky-500/10 dark:bg-sky-500/20",
    iconText: "text-sky-600 dark:text-sky-400",
    glow: "group-hover:shadow-[0_8px_30px_rgba(14,165,233,0.12)]",
    borderHover: "hover:border-sky-500/40 dark:hover:border-sky-500/40",
  },
  signal: {
    text: "text-signal dark:text-amber-400",
    badge: "bg-signal-soft/60 text-signal-dark dark:bg-signal/20 dark:text-amber-300 border-signal/30",
    iconBg: "bg-signal/10 dark:bg-signal/20",
    iconText: "text-signal dark:text-amber-400",
    glow: "group-hover:shadow-[0_8px_30px_rgba(217,119,6,0.14)]",
    borderHover: "hover:border-signal/50 dark:hover:border-signal/50",
  },
};

/**
 * Carte de statistique du dashboard & finances.
 * Design Spel-Rebel & Atelier Moderne : Glassmorphism élégant, typographie soignée,
 * halo d'accent au hover et chiffres haute lisibilité en mono.
 */
export function StatCard({
  label,
  value,
  helper,
  badge,
  tone = "neutral",
  icon: Icon,
  dataTour,
  trend,
}: StatCardProps) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral;

  return (
    <div
      data-tour={dataTour}
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 min-w-0 w-full shadow-xs transition-all duration-200 ease-out hover:-translate-y-1 ${styles.glow} ${styles.borderHover} flex flex-col justify-between group`}
    >
      {/* Specular Light Reflection Sweep on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400 truncate">
            {label}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && (
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${styles.badge}`}
              >
                {badge}
              </span>
            )}
            {Icon ? (
              <div
                className={`p-1.5 rounded-xl transition-transform duration-200 group-hover:scale-110 ${styles.iconBg} ${styles.iconText}`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
              </div>
            ) : null}
          </div>
        </div>

        <p
          className={`text-lg sm:text-2xl font-mono font-bold tracking-tight truncate ${styles.text}`}
          title={value}
        >
          {value}
        </p>
      </div>

      {(helper || trend) && (
        <div className="mt-2.5 pt-2 border-t border-ink-100/70 dark:border-white/5 flex items-center justify-between text-[10px] sm:text-[11px]">
          {helper && (
            <span className="text-ink-500 dark:text-ink-400 truncate">
              {helper}
            </span>
          )}
          {trend && (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-1 shrink-0">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
