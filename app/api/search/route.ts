import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get("q")?.trim() ?? "";

  // Assainissement strict pour neutraliser les caractères de contrôle PostgREST
  const sanitizedQ = rawQ.replace(/[,().%\\"]/g, " ").trim();
  if (!sanitizedQ || sanitizedQ.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit : max 45 requêtes de recherche par minute par utilisateur
  const rl = checkRateLimit(`search:${user.id}`, 45, 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Trop de requêtes. Veuillez ralentir." },
      { status: 429, headers: { "Retry-After": "10" } }
    );
  }

  const query = `%${sanitizedQ}%`;

  // Recherche parallèle sur les tables principales
  const [
    { data: activities },
    { data: tasks },
    { data: contacts },
    { data: organizations },
    { data: income },
    { data: expenses },
    { data: calendarEvents },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, type, color")
      .eq("user_id", user.id)
      .ilike("name", query)
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, status, priority")
      .eq("user_id", user.id)
      .or(`title.ilike.${query},description.ilike.${query}`)
      .limit(5),
    supabase
      .from("contacts")
      .select("id, name, email")
      .eq("user_id", user.id)
      .or(`name.ilike.${query},email.ilike.${query}`)
      .limit(5),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("user_id", user.id)
      .ilike("name", query)
      .limit(5),
    supabase
      .from("income")
      .select("id, label, amount, currency, due_date")
      .eq("user_id", user.id)
      .ilike("label", query)
      .limit(4),
    supabase
      .from("expenses")
      .select("id, label, amount, currency, category, due_date")
      .eq("user_id", user.id)
      .ilike("label", query)
      .limit(4),
    supabase
      .from("calendar_events")
      .select("id, title, starts_at")
      .eq("user_id", user.id)
      .ilike("title", query)
      .limit(4),
  ]);

  const results = [];

  if (activities && activities.length > 0) {
    results.push({
      category: "Activités",
      items: activities.map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: a.type,
        href: `/activities/${a.id}/edit`,
        color: a.color,
      })),
    });
  }

  if (tasks && tasks.length > 0) {
    results.push({
      category: "Tâches",
      items: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: `Priorité : ${t.priority} • Statut : ${t.status}`,
        href: `/tasks/${t.id}/edit`,
      })),
    });
  }

  if (contacts && contacts.length > 0) {
    results.push({
      category: "Contacts & Clients",
      items: contacts.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.email || "Contact",
        href: `/clients/contacts/${c.id}/edit`,
      })),
    });
  }

  if (organizations && organizations.length > 0) {
    results.push({
      category: "Organisations",
      items: organizations.map((o) => ({
        id: o.id,
        title: o.name,
        subtitle: "Organisation partenaire",
        href: `/clients/organizations/${o.id}/edit`,
      })),
    });
  }

  if (income && income.length > 0) {
    results.push({
      category: "Revenus",
      items: income.map((i) => ({
        id: i.id,
        title: i.label,
        subtitle: `+${i.amount} ${i.currency}`,
        href: `/finances/income/${i.id}/edit`,
      })),
    });
  }

  if (expenses && expenses.length > 0) {
    results.push({
      category: "Dépenses",
      items: expenses.map((e) => ({
        id: e.id,
        title: e.label,
        subtitle: `-${e.amount} ${e.currency} • ${e.category ?? "Général"}`,
        href: `/finances/expenses/${e.id}/edit`,
      })),
    });
  }

  if (calendarEvents && calendarEvents.length > 0) {
    results.push({
      category: "Calendrier",
      items: calendarEvents.map((ev) => ({
        id: ev.id,
        title: ev.title,
        subtitle: ev.starts_at ? new Date(ev.starts_at).toLocaleDateString("fr-FR") : "",
        href: `/calendar/${ev.id}`,
      })),
    });
  }

  return NextResponse.json({ results });
}
