import { Badge } from "@/components/ui/badge";

interface SubscriptionSectionProps {
  plan: "free" | "pro" | "premium";
  status: string;
}

const PLAN_LABELS: Record<string, string> = { free: "Free", pro: "Pro", premium: "Premium" };

/**
 * §72-73 du prompt maître — affichage seul pour l'instant : la
 * page de tarification, les entitlements centralisés et la facturation
 * réelle sont prévus en Phase 11, une fois les modules qu'ils limitent
 * (Épargne/Budgets/Rapports avancés) livrés.
 */
export function SubscriptionSection({ plan, status }: SubscriptionSectionProps) {
  return (
    <div className="max-w-lg">
      <h3 className="mb-1 text-sm font-semibold text-ink-950">Abonnement</h3>
      <p className="mb-4 text-sm text-ink-500">
        La page de tarification et les changements de plan arriveront dans une prochaine phase.
      </p>
      <div className="flex items-center gap-3 rounded-lg border border-ink-100 px-4 py-3">
        <Badge tone={plan === "free" ? "neutral" : "signal"}>{PLAN_LABELS[plan] ?? plan}</Badge>
        <span className="text-sm text-ink-500">Statut : {status}</span>
      </div>
    </div>
  );
}
