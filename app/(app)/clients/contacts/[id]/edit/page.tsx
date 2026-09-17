import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/shared/contact-form";
import { updateContact } from "../../../actions";
import { requireCurrentUser } from "@/lib/supabase/auth";

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const [{ data: contact }, { data: organizations }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, organization_id, phone, email, notes")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
    supabase.from("organizations").select("id, name").eq("user_id", user.id).order("name", { ascending: true }),
  ]);

  if (!contact) notFound();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-ink-950">Modifier {contact.name}</h1>
      <ContactForm
        organizations={organizations ?? []}
        action={updateContact.bind(null, contact.id)}
        submitLabel="Enregistrer les modifications"
        initial={{
          name: contact.name,
          organizationId: contact.organization_id ?? "",
          phone: contact.phone ?? "",
          email: contact.email ?? "",
          notes: contact.notes ?? "",
        }}
      />
    </div>
  );
}
