import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrganizationForm } from "@/components/shared/organization-form";
import { updateOrganization } from "../../../actions";
import { requireCurrentUser } from "@/lib/supabase/auth";

export default async function EditOrganizationPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, contact_name, phone, email, address")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!organization) notFound();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-ink-950">Modifier {organization.name}</h1>
      <OrganizationForm
        action={updateOrganization.bind(null, organization.id)}
        submitLabel="Enregistrer les modifications"
        initial={{
          name: organization.name,
          contactName: organization.contact_name ?? "",
          phone: organization.phone ?? "",
          email: organization.email ?? "",
          address: organization.address ?? "",
        }}
      />
    </div>
  );
}
