import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg shadow-gold/20 animate-bounce">
          <span className="text-white font-black text-xl">R</span>
        </div>
        <div className="space-y-1">
          <div className="h-5 w-28 bg-ink-200 dark:bg-ink-800 rounded-lg animate-pulse" />
          <div className="h-3 w-20 bg-ink-100 dark:bg-ink-900 rounded-md animate-pulse" />
        </div>
      </div>
      <div className="w-48 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
        <div className="h-full bg-gold rounded-full w-2/3 animate-pulse" />
      </div>
    </div>
  );
}
