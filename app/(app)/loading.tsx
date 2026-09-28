export default function AppLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse" aria-label="Chargement de votre espace...">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ink-100 dark:border-ink-800">
        <div className="space-y-2">
          <div className="h-8 w-56 sm:w-72 rounded-xl bg-ink-200/70 dark:bg-ink-800/70 animate-pulse" />
          <div className="h-4 w-40 sm:w-60 rounded-lg bg-ink-100 dark:bg-ink-800/40" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-xl bg-ink-200/60 dark:bg-ink-800/60" />
          <div className="h-9 w-32 rounded-xl bg-signal/20 dark:bg-signal/30" />
        </div>
      </div>

      {/* KPI Cards Skeleton (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-ink-200/80 dark:bg-ink-800/80" />
              <div className="h-8 w-8 rounded-xl bg-ink-100 dark:bg-ink-800/60" />
            </div>
            <div className="h-7 w-24 rounded-lg bg-ink-200/90 dark:bg-ink-700/90" />
            <div className="h-3 w-36 rounded bg-ink-100 dark:bg-ink-800/40" />
          </div>
        ))}
      </div>

      {/* Attention / Banner Skeleton */}
      <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-100 dark:border-ink-800/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-soft/50 dark:bg-gold/20 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-48 rounded bg-ink-200/80 dark:bg-ink-800/80" />
            <div className="h-3 w-64 rounded bg-ink-100 dark:bg-ink-800/40" />
          </div>
        </div>
        <div className="h-8 w-24 rounded-xl bg-ink-200/60 dark:bg-ink-800/60" />
      </div>

      {/* Main Content Grid Skeleton (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main panel (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-canvas-raised border border-ink-100 dark:border-ink-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 rounded-lg bg-ink-200/80 dark:bg-ink-800/80" />
            <div className="h-4 w-20 rounded bg-ink-100 dark:bg-ink-800/50" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-canvas border border-ink-100/80 dark:border-ink-800/60 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-10 rounded-full bg-signal/30" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-44 sm:w-56 rounded bg-ink-200/80 dark:bg-ink-700/80" />
                    <div className="h-3 w-32 rounded bg-ink-100 dark:bg-ink-800/50" />
                  </div>
                </div>
                <div className="h-6 w-16 rounded-full bg-ink-100 dark:bg-ink-800/60" />
              </div>
            ))}
          </div>
        </div>

        {/* Right panel (1 col) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-canvas-raised border border-ink-100 dark:border-ink-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 rounded-lg bg-ink-200/80 dark:bg-ink-800/80" />
            <div className="h-4 w-16 rounded bg-ink-100 dark:bg-ink-800/50" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-canvas border border-ink-100/80 dark:border-ink-800/60 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 rounded bg-ink-200/80 dark:bg-ink-700/80" />
                  <div className="h-4 w-16 rounded bg-ink-200/80 dark:bg-ink-700/80" />
                </div>
                <div className="h-3 w-36 rounded bg-ink-100 dark:bg-ink-800/40" />
                <div className="h-7 w-full rounded-xl bg-signal/15 dark:bg-signal/25" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
