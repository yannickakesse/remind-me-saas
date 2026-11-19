/**
 * Destination d'une notification : l'élément exact qui l'a déclenchée (séance, tâche, paiement, facture…),
 * y compris pour les notifications créées avant que leur lien soit précis.
 */
export function notificationHref(n: {
  link?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  kind?: string | null;
}): string {
  const link = n.link || "";
  const id = n.entity_id || "";
  const generic = !link || ["/finances", "/finances?tab=expenses", "/activities", "/dashboard", "/notifications"].includes(link);
  // UUID : seul un vrai identifiant d'élément mène à une page de détail
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (generic && n.entity_type === "scheduled_expense") return "/finances?tab=scheduled";
  if (generic && isUuid) {
    switch (n.entity_type) {
      case "income":
        return `/finances/income/${id}/edit`;
      case "expense":
        return `/finances/expenses/${id}/edit`;
      case "task":
        return `/tasks/${id}/edit`;
      case "activity":
        return n.kind === "activity_expiring_soon" || n.kind === "activity_expired" ? `/activities?renew=${id}` : `/calendar/${id}`;
    }
  }
  return link || "/notifications";
}
