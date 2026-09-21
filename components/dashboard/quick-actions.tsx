import Link from "next/link";
import { Plus, Briefcase, CheckSquare, TrendingUp, TrendingDown } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

const ACTIONS = [
  { href: "/activities/new", label: "Activité", icon: Briefcase },
  { href: "/tasks/new", label: "Tâche", icon: CheckSquare },
  { href: "/finances/income/new", label: "Revenu", icon: TrendingUp },
  { href: "/finances?tab=scheduled&action=new", label: "Dépense", icon: TrendingDown },
] as const;

/** §27 du prompt maître — actions rapides dans le header du dashboard. */
export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action, index) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className={buttonClasses(index === 0 ? "primary" : "secondary", "sm")}
          >
            <Plus className="w-3.5 h-3.5 mr-1 shrink-0" strokeWidth={2.5} />
            <span>{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
