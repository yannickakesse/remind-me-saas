import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
}

/**
 * §143 du prompt maître — "un nouvel utilisateur ne doit jamais voir un
 * dashboard mort". Affichée tant que toutes les étapes ne sont pas
 * complétées ; remplace l'ancien bloc "vous n'avez pas d'activité" par une
 * checklist qui montre explicitement quoi faire ensuite.
 */
export function OnboardingChecklist({ items }: OnboardingChecklistProps) {
  const firstPending = items.find((item) => !item.done);

  return (
    <div className="rounded-xl border border-ink-200 bg-canvas-raised px-6 py-6 shadow-xs">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-signal" />
        <p className="text-lg font-semibold text-ink-950">Bienvenue sur Remind Me</p>
      </div>
      <p className="mb-5 text-sm text-ink-500">
        Quelques étapes pour configurer votre espace et voir apparaître votre planning et vos revenus.
      </p>

      <ul className="mb-5 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                item.done ? "border-positive bg-positive text-white" : "border-ink-300 bg-canvas text-transparent"
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className={item.done ? "text-ink-500 line-through" : "text-ink-950 font-medium"}>{item.label}</span>
          </li>
        ))}
      </ul>

      {firstPending?.href ? (
        <Link href={firstPending.href} className={buttonClasses("primary", "md")}>
          {firstPending.label}
        </Link>
      ) : null}
    </div>
  );
}
