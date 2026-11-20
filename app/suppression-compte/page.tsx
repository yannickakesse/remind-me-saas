import type { Metadata } from "next";
import Link from "next/link";
import { getTr } from "@/lib/i18n/server";
import { LegalPage } from "@/components/legal/legal-page";
import { SUPPORT_EMAIL, LEGAL_UPDATED_AT, APP_URL } from "@/lib/legal";

// Page publique demandée par Google Play (« lien de suppression du compte ») et utile pour Apple.
export async function generateMetadata(): Promise<Metadata> {
  const tr = await getTr();
  return { title: tr("Supprimer mon compte"), alternates: { canonical: `${APP_URL}/suppression-compte` } };
}

export default async function DeleteAccountPage() {
  const tr = await getTr();
  return (
    <LegalPage title={tr("Supprimer mon compte Remind Me")} updated={tr("Dernière mise à jour : {date}", { date: LEGAL_UPDATED_AT })}>
      <p>{tr("Vous pouvez supprimer votre compte vous-même, à tout moment, gratuitement, depuis l'application ou le site.")}</p>

      <h2>{tr("Les étapes")}</h2>
      <ul>
        <li>{tr("1. Connectez-vous à Remind Me.")}</li>
        <li>{tr("2. Ouvrez Réglages, puis la rubrique Données.")}</li>
        <li>{tr("3. Touchez « Supprimer mon compte définitivement » et confirmez.")}</li>
      </ul>
      <p>
        <Link href="/settings?tab=data">{tr("Ouvrir directement la rubrique Données")}</Link>
      </p>

      <h2>{tr("Ce qui est effacé")}</h2>
      <p>{tr("Votre compte et tout son contenu sont effacés définitivement et immédiatement : profil, photo, activités, agenda, tâches, objectifs, revenus, dépenses, contacts, notifications et appareils enregistrés. Cette action ne peut pas être annulée.")}</p>

      <h2>{tr("Ce qui peut être gardé")}</h2>
      <p>{tr("Seule une trace des paiements déjà effectués peut être conservée, le temps exigé par la loi.")}</p>

      <h2>{tr("Vous n'arrivez plus à vous connecter ?")}</h2>
      {SUPPORT_EMAIL ? (
        <p>
          {tr("Écrivez-nous depuis l'adresse e-mail de votre compte à")} <a href={`mailto:${SUPPORT_EMAIL}?subject=Suppression%20de%20compte`}>{SUPPORT_EMAIL}</a>
          {tr(" en demandant la suppression. Nous la traitons sous 30 jours.")}
        </p>
      ) : (
        <p>{tr("Utilisez d'abord « Mot de passe oublié » sur la page de connexion pour retrouver l'accès, puis suivez les étapes ci-dessus.")}</p>
      )}

      <p>
        <Link href="/confidentialite">{tr("Politique de confidentialité")}</Link>
      </p>
    </LegalPage>
  );
}
