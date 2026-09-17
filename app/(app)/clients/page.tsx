import Link from "next/link";
import { Users, Building2, User, Mail, Phone, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { deleteOrganization, deleteContact } from "./actions";
import { buttonClasses } from "@/components/ui/button";

export default async function ClientsPage() {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const [{ data: organizations }, { data: contacts }, { data: activityCounts }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, contact_name, phone, email")
      .eq("user_id", user!.id)
      .order("name", { ascending: true }),
    supabase
      .from("contacts")
      .select("id, name, phone, email, notes, organization_id, organizations(name)")
      .eq("user_id", user!.id)
      .order("name", { ascending: true }),
    supabase
      .from("activities")
      .select("organization_id")
      .eq("user_id", user!.id)
      .not("organization_id", "is", null),
  ]);

  const activityCountByOrg = new Map<string, number>();
  for (const a of activityCounts ?? []) {
    if (!a.organization_id) continue;
    activityCountByOrg.set(a.organization_id, (activityCountByOrg.get(a.organization_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-10">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 flex items-center gap-2">
            <span className="bg-signal text-white p-1.5 rounded-xl shadow-xs inline-flex">
              <Users className="w-5 h-5" />
            </span>
            Clients & Contacts
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Répertoire centralisé de vos organisations partenaires, écoles, clients et contacts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/clients/organizations/new" className={buttonClasses("secondary", "sm")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nouvelle organisation
          </Link>
          <Link href="/clients/contacts/new" className={buttonClasses("primary", "sm")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau contact
          </Link>
        </div>
      </div>

      {/* 1. ORGANISATIONS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-950 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-signal" /> Organisations ({(organizations ?? []).length})
          </h2>
          <Link href="/clients/organizations/new" className="text-xs font-semibold text-signal hover:underline">
            + Ajouter
          </Link>
        </div>

        {(organizations ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/50 p-6 text-center text-sm text-ink-500">
            Aucune organisation enregistrée pour l'instant.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(organizations ?? []).map((org) => {
              const actCount = activityCountByOrg.get(org.id) ?? 0;
              return (
                <div
                  key={org.id}
                  className="flex flex-col justify-between rounded-xl border border-ink-200 bg-canvas-raised p-4 space-y-3 hover:border-ink-300 hover:shadow-xs transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-ink-950 text-base">{org.name}</h3>
                      {actCount > 0 ? (
                        <span className="rounded-full bg-signal-soft px-2 py-0.5 text-[10px] font-bold text-signal">
                          {actCount} activité{actCount > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs text-ink-600 space-y-1">
                      {org.contact_name ? (
                        <p className="flex items-center gap-1.5 text-ink-700">
                          <User className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                          <span>{org.contact_name}</span>
                        </p>
                      ) : null}
                      {org.email ? (
                        <p className="flex items-center gap-1.5 truncate text-ink-600">
                          <Mail className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                          <span className="truncate">{org.email}</span>
                        </p>
                      ) : null}
                      {org.phone ? (
                        <p className="flex items-center gap-1.5 text-ink-600">
                          <Phone className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                          <span>{org.phone}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
                    <Link
                      href={`/clients/organizations/${org.id}/edit`}
                      className="text-xs font-semibold text-signal hover:underline px-2 py-1 min-h-[32px] inline-flex items-center"
                    >
                      Modifier
                    </Link>
                    <form action={deleteOrganization.bind(null, org.id)}>
                      <button
                        type="submit"
                        className="text-xs text-ink-400 hover:text-danger px-2 py-1 min-h-[32px] inline-flex items-center cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. CONTACTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-950 flex items-center gap-1.5">
            <User className="w-4 h-4 text-signal" /> Contacts ({(contacts ?? []).length})
          </h2>
          <Link href="/clients/contacts/new" className="text-xs font-semibold text-signal hover:underline">
            + Ajouter
          </Link>
        </div>

        {(contacts ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/50 p-6 text-center text-sm text-ink-500">
            Aucun contact enregistré pour l'instant.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(contacts ?? []).map((contact) => {
              const org = Array.isArray(contact.organizations)
                ? contact.organizations[0]
                : contact.organizations;

              return (
                <div
                  key={contact.id}
                  className="flex flex-col justify-between rounded-xl border border-ink-200 bg-canvas-raised p-4 space-y-3 hover:border-ink-300 hover:shadow-xs transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-ink-950 text-base">{contact.name}</h3>
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                        {org?.name ?? "Indépendant"}
                      </span>
                    </div>

                    <div className="text-xs text-ink-600 space-y-1">
                      {contact.email ? (
                        <p className="flex items-center gap-1.5 truncate text-ink-600">
                          <Mail className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </p>
                      ) : null}
                      {contact.phone ? (
                        <p className="flex items-center gap-1.5 text-ink-600">
                          <Phone className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                          <span>{contact.phone}</span>
                        </p>
                      ) : null}
                      {contact.notes ? (
                        <p className="flex items-center gap-1.5 text-ink-500 italic truncate">
                          <FileText className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                          <span className="truncate">{contact.notes}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
                    <Link
                      href={`/clients/contacts/${contact.id}/edit`}
                      className="text-xs font-semibold text-signal hover:underline px-2 py-1 min-h-[32px] inline-flex items-center"
                    >
                      Modifier
                    </Link>
                    <form action={deleteContact.bind(null, contact.id)}>
                      <button
                        type="submit"
                        className="text-xs text-ink-400 hover:text-danger px-2 py-1 min-h-[32px] inline-flex items-center cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
