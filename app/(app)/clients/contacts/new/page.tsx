import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/shared/contact-form";
import { createContact } from "../../actions";
import { requireCurrentUser } from "@/lib/supabase/auth";

export default async function NewContactPage() {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink-950">Nouveau contact</h1>
      <p className="mb-8 text-ink-500">Une personne, rattachée ou non à une organisation.</p>
      <ContactForm organizations={organizations ?? []} action={createContact} />
    </div>
  );
}
