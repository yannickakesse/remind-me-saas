"use client";

/**
 * Raccourci permanent vers les abonnements : l'utilisateur voit son forfait et sait qu'il peut évoluer.
 * Discret, toujours au même endroit (barre latérale sur ordinateur, en-tête sur mobile).
 */
import Link from "next/link";
import { Sparkles, Crown } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { PlanInfo } from "@/components/subscriptions/offer-sheet";

export function PlanBadge({ info, compact = false }: { info: PlanInfo; compact?: boolean }) {
  const { tr } = useLanguage();
  const href = "/settings?tab=subscription";

  let label: string;
  let action: string | null;
  let tone: string;
  if (info.paidPlan === "premium") {
    label = tr("Premium");
    action = null;
    tone = "bg-[#D99A24]/12 text-amber-800 ring-[#D99A24]/30 dark:text-amber-300";
  } else if (info.isTrial) {
    label = info.trialDaysLeft > 1 ? tr("Essai Pro · {n} j", { n: info.trialDaysLeft }) : tr("Essai Pro · dernier jour");
    action = tr("Voir les offres");
    tone = "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  } else if (info.paidPlan === "pro") {
    label = tr("Pro");
    action = tr("Passer à Premium");
    tone = "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  } else {
    label = tr("Gratuit");
    action = tr("Découvrir Pro");
    tone = "bg-ink-100/80 text-ink-800 ring-ink-300/60 dark:bg-white/5 dark:text-ink-100 dark:ring-white/10";
  }
  const Icon = info.paidPlan === "premium" ? Crown : Sparkles;

  if (compact) {
    return (
      <Link href={href} aria-label={action ? `${label} — ${action}` : label} className={`inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-bold ring-1 ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        {/* Petits écrans : l'icône seule (le nom du forfait reste annoncé aux lecteurs d'écran) */}
        <span className="hidden max-w-[92px] truncate min-[420px]:inline">{label}</span>
      </Link>
    );
  }

  return (
    <Link href={href} className={`group flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs ring-1 transition-colors ${tone}`}>
      <span className="inline-flex min-w-0 items-center gap-1.5 font-bold">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {action && <span className="shrink-0 font-semibold underline-offset-2 group-hover:underline">{action}</span>}
    </Link>
  );
}
