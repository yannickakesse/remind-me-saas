import { getTr } from "@/lib/i18n/server";
import { PageBackground } from "@/components/shared/page-background";
import Link from "next/link";
import { Users, Building2, User, Mail, Phone, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { deleteOrganization, deleteContact } from "./actions";
import { buttonClasses } from "@/components/ui/button";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";

export default async function ClientsPage() {
  const tr = await getTr();
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
    <div className="relative isolate min-h-full w-full space-y-10">
      <PageBackground src="/images/backgrounds/clients-call-bg.jpg" />

      {/* En-tête avec bannière */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md p-6 sm:p-8 shadow-xs" data-tour="clients-header">

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-signal text-white shadow-xs">
                <Users className="w-5 h-5" />
              </span>
              {tr("Clients & Contacts")}</h1>
            <p className="text-sm text-ink-500 mt-1">
              {tr("Répertoire centralisé de vos organisations partenaires, écoles, clients et contacts.")}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            <SectionGuideTrigger section="clients" label={tr("Guide clients")} />
            <Link href="/clients/organizations/new" className={buttonClasses("secondary", "sm")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> {tr("Nouvelle organisation")}</Link>
            <Link href="/clients/contacts/new" data-tour="client-create" className={buttonClasses("primary", "sm")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> {tr("Nouveau contact")}</Link>
          </div>
        </div>
      </div>

      {/* 1. ORGANISATIONS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md border border-ink-200/80 dark:border-ink-800 px-4 py-2.5 shadow-2xs">
          <h2 className="text-base font-bold text-ink-950 dark:text-white flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-signal" /> {tr("Organisations (")}{(organizations ?? []).length})
          </h2>
          <Link href="/clients/organizations/new" className="text-xs font-semibold text-signal hover:underline">
            {tr("+ Ajouter")}</Link>
        </div>

        {(organizations ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md p-6 text-center text-sm text-ink-700 dark:text-ink-300">
            {tr("Aucune organisation enregistrée pour l'instant.")}</div>
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
                          {actCount} {tr("activité")}{actCount > 1 ? "s" : ""}
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
                      {tr("Modifier")}</Link>
                    <form action={deleteOrganization.bind(null, org.id)}>
                      <button
                        type="submit"
                        className="text-xs text-ink-400 hover:text-danger px-2 py-1 min-h-[32px] inline-flex items-center cursor-pointer"
                      >
                        {tr("Supprimer")}</button>
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
        <div className="flex items-center justify-between rounded-2xl bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md border border-ink-200/80 dark:border-ink-800 px-4 py-2.5 shadow-2xs">
          <h2 className="text-base font-bold text-ink-950 dark:text-white flex items-center gap-1.5">
            <User className="w-4 h-4 text-signal" /> {tr("Contacts (")}{(contacts ?? []).length})
          </h2>
          <Link href="/clients/contacts/new" className="text-xs font-semibold text-signal hover:underline">
            {tr("+ Ajouter")}</Link>
        </div>

        {(contacts ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md p-6 text-center text-sm text-ink-700 dark:text-ink-300">
            {tr("Aucun contact enregistré pour l'instant.")}</div>
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
                        {org?.name ?? tr("Indépendant")}
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
                      {tr("Modifier")}</Link>
                    <form action={deleteContact.bind(null, contact.id)}>
                      <button
                        type="submit"
                        className="text-xs text-ink-400 hover:text-danger px-2 py-1 min-h-[32px] inline-flex items-center cursor-pointer"
                      >
                        {tr("Supprimer")}</button>
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
