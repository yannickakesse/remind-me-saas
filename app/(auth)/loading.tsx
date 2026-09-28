export default function AuthLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas">
      <div className="w-full max-w-sm space-y-6 animate-pulse" aria-label="Chargement...">
        {/* Top bar skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-ink-200/80 dark:bg-ink-800/80" />
            <div className="h-5 w-24 rounded bg-ink-200/80 dark:bg-ink-800/80" />
          </div>
          <div className="h-7 w-16 rounded-full bg-ink-200/60 dark:bg-ink-800/60" />
        </div>

        {/* Card skeleton */}
        <div className="rounded-3xl border border-ink-200 dark:border-ink-800 bg-canvas-raised p-6 sm:p-8 shadow-xl space-y-5">
          <div className="text-center space-y-2 mb-6">
            <div className="h-7 w-40 mx-auto rounded-lg bg-ink-200/90 dark:bg-ink-700/90" />
            <div className="h-4 w-52 mx-auto rounded bg-ink-100 dark:bg-ink-800/60" />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="h-3.5 w-16 rounded bg-ink-200/70 dark:bg-ink-800/70" />
              <div className="h-10 w-full rounded-md bg-ink-100 dark:bg-ink-800/50" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-ink-200/70 dark:bg-ink-800/70" />
              <div className="h-10 w-full rounded-md bg-ink-100 dark:bg-ink-800/50" />
            </div>
            <div className="h-11 w-full rounded-md bg-signal/30 dark:bg-signal/40" />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="h-3 w-28 rounded bg-ink-100 dark:bg-ink-800/50" />
            <div className="h-3 w-24 rounded bg-ink-100 dark:bg-ink-800/50" />
          </div>
        </div>
      </div>
    </main>
  );
}
