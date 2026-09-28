export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas/80 backdrop-blur-xs transition-opacity duration-200">
      <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-canvas-raised border border-ink-200/80 dark:border-ink-800/80 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-signal/20 border-t-signal rounded-full animate-spin" />
        </div>
        <p className="text-xs font-semibold text-ink-700 dark:text-ink-300 tracking-tight">
          Chargement en cours...
        </p>
      </div>
    </div>
  );
}
