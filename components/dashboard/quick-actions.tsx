import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

const ACTIONS = [
  { href: "/activities/new", label: "+ Activité" },
  { href: "/tasks/new", label: "+ Tâche" },
  { href: "/finances/income/new", label: "+ Revenu" },
  { href: "/finances/expenses/new", label: "+ Dépense" },
] as const;

/** §27 du prompt maître — actions rapides dans le header du dashboard. */
export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action, index) => (
        <Link
          key={action.href}
          href={action.href}
          className={buttonClasses(index === 0 ? "primary" : "secondary", "sm")}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}
