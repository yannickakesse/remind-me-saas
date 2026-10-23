import { Skeleton } from "@/components/ui/skeleton";

export default function ActivitiesLoading() {
  return (
    <div className="relative isolate min-h-full w-full space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-80 rounded-lg" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-24 rounded-2xl" />
            <Skeleton className="h-10 w-36 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Tabs & Search Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-ink-200/80 dark:border-white/10 bg-canvas-raised/80 dark:bg-slate-900/80">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-64 rounded-2xl" />
      </div>

      {/* Activities Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between gap-4 rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 p-5 sm:p-6 shadow-xs"
          >
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                  <Skeleton className="h-5 w-32 rounded-lg" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-40 rounded-md" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-28 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
            </div>
            <div className="pt-3 border-t border-ink-100 dark:border-white/5 flex items-center justify-between">
              <Skeleton className="h-7 w-20 rounded-xl" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-xl" />
                <Skeleton className="h-7 w-7 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
