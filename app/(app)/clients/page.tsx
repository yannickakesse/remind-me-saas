import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteOrganization, deleteContact } from "./actions";

export default async function ClientsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: organizations }, { data: contacts }, { data: activityCounts }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, contact_name, phone, email")
      .eq("user_id", user!.id)
      .order("name", { ascending: true }),
    supabase
      .from("contacts")
      .select("id, name, phone, email, organization_id, organizations(name)")
      .eq("user_id", user!.id)
      .order("name", { ascending: true }),
    // Décompte des activités par organisation, pour donner un peu de
    // contexte sans faire une jointure N+1 par organisation affichée.
    supabase.from("activities").select("organization_id").eq("user_id", user!.id).not("organization_id", "is", null),
  ]);

  const activityCountByOrg = new Map<string, number>();
  for (const a of activityCounts ?? []) {
    if (!a.organization_id) continue;
    activityCountByOrg.set(a.organization_id, (activityCountByOrg.get(a.organization_id) ?? 0) + 1);
  }

  const unassignedContacts = (contacts ?? []).filter((c) => !c.organization_id);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Clients</h1>
          <p className="text-ink-500">Organisations et contacts, indépendamment des activités.</p>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Organisations ({(organizations ?? []).length})
          </h2>
          <Link href="/clients/organizations/new" className="text-sm font-medium text-signal hover:underline">
            + Ajouter une organisation
          </Link>
        </div>
        {(organizations ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">
            Aucune organisation pour l&apos;instant — elles se créent aussi automatiquement quand vous en saisissez
            une sur une activité.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(organizations ?? []).map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-ink-100 bg-canvas-raised px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink-950">{org.name}</p>
                  <p className="text-sm text-ink-500">
                    {org.contact_name ? <span className="mr-2">{org.contact_name}</span> : null}
                    {org.phone ? <span className="mr-2">{org.phone}</span> : null}
                    {org.email ? <span className="mr-2">{org.email}</span> : null}
                    {activityCountByOrg.get(org.id)
                      ? `${activityCountByOrg.get(org.id)} activité(s) liée(s)`
                      : "Aucune activité liée"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/clients/organizations/${org.id}/edit`}
                    className="text-sm font-medium text-signal hover:underline"
                  >
                    Modifier
                  </Link>
                  <form action={deleteOrganization.bind(null, org.id)}>
                    <button type="submit" className="text-sm text-ink-500 hover:text-danger hover:underline">
                      Supprimer
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Contacts ({(contacts ?? []).length})
          </h2>
          <Link href="/clients/contacts/new" className="text-sm font-medium text-signal hover:underline">
            + Ajouter un contact
          </Link>
        </div>
        {(contacts ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">Aucun contact pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(contacts ?? []).map((contact) => {
              const org = Array.isArray(contact.organizations) ? contact.organizations[0] : contact.organizations;
              return (
                <li
                  key={contact.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-ink-100 bg-canvas-raised px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink-950">{contact.name}</p>
                    <p className="text-sm text-ink-500">
                      {org?.name ? <span className="mr-2">{org.name}</span> : <span className="mr-2">Indépendant</span>}
                      {contact.phone ? <span className="mr-2">{contact.phone}</span> : null}
                      {contact.email ? <span className="mr-2">{contact.email}</span> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/clients/contacts/${contact.id}/edit`}
                      className="text-sm font-medium text-signal hover:underline"
                    >
                      Modifier
                    </Link>
                    <form action={deleteContact.bind(null, contact.id)}>
                      <button type="submit" className="text-sm text-ink-500 hover:text-danger hover:underline">
                        Supprimer
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {unassignedContacts.length > 0 ? (
          <p className="mt-2 text-xs text-ink-500">{unassignedContacts.length} contact(s) sans organisation.</p>
        ) : null}
      </section>
    </div>
  );
}
