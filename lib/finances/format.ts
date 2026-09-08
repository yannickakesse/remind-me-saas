/**
 * Format d'affichage monétaire commun à toute l'app (dashboard, finances,
 * rapports). Volontairement pas `Intl.NumberFormat(locale, { style:
 * "currency" })` : les codes devise utilisateur (ex. XOF) ne sont pas tous
 * garantis reconnus par `Intl`, ce qui ferait planter le formatage — on
 * affiche donc le nombre localisé suivi du code devise brut (§138 du
 * prompt maître : précision monétaire sûre, jamais de manipulation float
 * risquée — ici on ne fait qu'afficher, aucun calcul).
 */
export function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
