import { OrganizationForm } from "@/components/shared/organization-form";
import { createOrganization } from "../../actions";

export default function NewOrganizationPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink-950">Nouvelle organisation</h1>
      <p className="mb-8 text-ink-500">Une entreprise ou un client, indépendamment de toute activité.</p>
      <OrganizationForm action={createOrganization} />
    </div>
  );
}
