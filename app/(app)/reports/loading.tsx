import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-ink-100 bg-canvas-raised space-y-3 shadow-xs"
          >
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl border border-ink-100 bg-canvas-raised space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <div className="h-56 rounded-xl bg-ink-50/50 flex items-end justify-between p-4 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className={`w-full rounded-t-lg h-${((i % 4) + 1) * 12}`} />
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-ink-100 bg-canvas-raised space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <div className="h-56 rounded-xl bg-ink-50/50 flex items-center justify-center">
            <Skeleton className="h-36 w-36 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
