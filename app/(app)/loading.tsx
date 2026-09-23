import { Skeleton } from "@/components/ui/skeleton";

export default function AppRootLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* KPI Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-ink-100 bg-canvas-raised space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Content Skeleton Block */}
      <div className="p-6 rounded-2xl border border-ink-100 bg-canvas-raised space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-44 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-ink-50/50">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
