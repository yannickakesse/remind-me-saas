import { getTr } from "@/lib/i18n/server";
import { OrganizationForm } from "@/components/shared/organization-form";
import { createOrganization } from "../../actions";

export default async function NewOrganizationPage() {
  const tr = await getTr();
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink-950">{tr("Nouvelle organisation")}</h1>
      <p className="mb-8 text-ink-500">{tr("Une entreprise ou un client, indépendamment de toute activité.")}</p>
      <OrganizationForm action={createOrganization} />
    </div>
  );
}
