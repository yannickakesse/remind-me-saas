import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-4 w-60 rounded-md" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Settings Form Card */}
      <div className="p-6 rounded-2xl border border-ink-100 bg-canvas-raised space-y-6 shadow-xs">
        <div className="space-y-4">
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        <div className="pt-4 border-t border-ink-100 space-y-4">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}
