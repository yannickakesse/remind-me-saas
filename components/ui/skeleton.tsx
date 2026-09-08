interface SkeletonProps {
  className?: string;
}

/**
 * Bloc de chargement générique — shimmer discret (§14/§61 du prompt maître).
 * Réserve la place exacte de son conteneur pour éviter tout layout shift
 * (§84 — Core Web Vitals / CLS).
 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-ink-100 ${className}`} aria-hidden="true" />;
}

/** Plusieurs lignes de texte simulées, pour les listes/paragraphes en chargement. */
export function SkeletonLines({ count = 3, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === count - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
