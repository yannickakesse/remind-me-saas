import Link from "next/link";
import type { ReactNode } from "react";
import { RemindMeLogo } from "@/components/landing/remindme-logo";

// Mise en page sobre et lisible pour les pages légales publiques (exigées par Apple et Google).
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink-950 dark:text-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link href="/" className="inline-flex mb-8" aria-label="Remind Me">
          <RemindMeLogo size="sm" showText={true} />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">{updated}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-700 dark:text-ink-300 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink-950 dark:[&_h2]:text-white [&_h2]:mt-10 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-signal [&_a]:underline">
          {children}
        </div>
      </div>
    </div>
  );
}
