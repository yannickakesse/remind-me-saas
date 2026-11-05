import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { getTr } from "@/lib/i18n/server";

interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
}

/**
 * « Un nouvel utilisateur ne doit jamais voir un tableau de bord vide » : checklist centrée
 * affichée tant que les premières étapes ne sont pas faites, avec l'action suivante bien visible.
 */
export async function OnboardingChecklist({ items }: OnboardingChecklistProps) {
  const tr = await getTr();
  const firstPending = items.find((item) => !item.done);

  return (
    <div className="rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 px-6 py-6 shadow-xs backdrop-blur-xl text-center">
      <div className="mb-1 flex items-center justify-center gap-2">
        <Sparkles className="h-5 w-5 text-signal" />
        <p className="text-lg font-bold text-ink-950 dark:text-white">{tr("Bienvenue sur Remind Me")}</p>
      </div>
      <p className="mx-auto mb-5 max-w-sm text-sm text-ink-600 dark:text-ink-300">
        {tr("Quelques étapes pour configurer votre espace et voir apparaître votre planning et vos revenus.")}
      </p>

      <ul className="mx-auto mb-5 flex w-fit flex-col items-start gap-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                item.done ? "border-positive bg-positive text-white" : "border-ink-300 dark:border-white/30 bg-canvas text-transparent"
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className={item.done ? "text-ink-500 line-through" : "font-medium text-ink-950 dark:text-white"}>{tr(item.label)}</span>
          </li>
        ))}
      </ul>

      {firstPending?.href ? (
        <Link href={firstPending.href} className={`${buttonClasses("primary", "md")} mx-auto`}>
          {tr(firstPending.label)}
        </Link>
      ) : null}
    </div>
  );
}
