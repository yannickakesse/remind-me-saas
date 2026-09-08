interface SpinnerProps {
  className?: string;
  /** Taille en pixels (largeur = hauteur). Défaut : 16. */
  size?: number;
}

/** Petit indicateur de chargement circulaire, utilisé par Button et les états loading. */
export function Spinner({ className = "", size = 16 }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Chargement"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V1.5A10.5 10.5 0 0 0 1.5 12H4Z"
      />
    </svg>
  );
}
