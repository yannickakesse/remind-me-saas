"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { organizationFormSchema, contactFormSchema } from "@/lib/validation/clients";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function parseOrganizationForm(formData: FormData) {
  return organizationFormSchema.parse({
    name: formData.get("name"),
    contactName: formData.get("contactName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
  });
}

function parseContactForm(formData: FormData) {
  return contactFormSchema.parse({
    name: formData.get("name"),
    organizationId: formData.get("organizationId") || "",
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    notes: formData.get("notes") || undefined,
  });
}

// ----------------------------------------------------------------------------
// Organisations
// ----------------------------------------------------------------------------
export async function createOrganization(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseOrganizationForm(formData);

  const { error } = await supabase.from("organizations").insert({
    user_id: user.id,
    name: parsed.name,
    contact_name: parsed.contactName || null,
    phone: parsed.phone || null,
    email: parsed.email || null,
    address: parsed.address || null,
  });

  if (error) throw new Error("Impossible de créer l'organisation.");

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateOrganization(organizationId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseOrganizationForm(formData);

  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.name,
      contact_name: parsed.contactName || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
    })
    .eq("id", organizationId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de modifier l'organisation.");

  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteOrganization(organizationId: string) {
  const { supabase, user } = await requireUser();

  // Les activités et contacts liés ne sont pas supprimés : leur
  // organization_id repasse à null (on delete set null, migration 0002) —
  // supprimer une organisation ne fait jamais disparaître une activité ou
  // un revenu qui en dépend.
  const { error } = await supabase.from("organizations").delete().eq("id", organizationId).eq("user_id", user.id);

  if (error) throw new Error("Impossible de supprimer l'organisation.");

  revalidatePath("/clients");
}

// ----------------------------------------------------------------------------
// Contacts
// ----------------------------------------------------------------------------
export async function createContact(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseContactForm(formData);

  const { error } = await supabase.from("contacts").insert({
    user_id: user.id,
    organization_id: parsed.organizationId || null,
    name: parsed.name,
    phone: parsed.phone || null,
    email: parsed.email || null,
    notes: parsed.notes || null,
  });

  if (error) throw new Error("Impossible de créer le contact.");

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateContact(contactId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseContactForm(formData);

  const { error } = await supabase
    .from("contacts")
    .update({
      organization_id: parsed.organizationId || null,
      name: parsed.name,
      phone: parsed.phone || null,
      email: parsed.email || null,
      notes: parsed.notes || null,
    })
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de modifier le contact.");

  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteContact(contactId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("contacts").delete().eq("id", contactId).eq("user_id", user.id);

  if (error) throw new Error("Impossible de supprimer le contact.");

  revalidatePath("/clients");
}
