import type { Metadata } from "next";
import Link from "next/link";
import { getTr } from "@/lib/i18n/server";
import { LegalPage } from "@/components/legal/legal-page";
import { SUPPORT_EMAIL, LEGAL_UPDATED_AT, APP_URL } from "@/lib/legal";

// Politique de confidentialité publique : son adresse est demandée par l'App Store et le Play Store.
export async function generateMetadata(): Promise<Metadata> {
  const tr = await getTr();
  return { title: tr("Politique de confidentialité"), alternates: { canonical: `${APP_URL}/confidentialite` } };
}

export default async function PrivacyPage() {
  const tr = await getTr();
  return (
    <LegalPage title={tr("Politique de confidentialité")} updated={tr("Dernière mise à jour : {date}", { date: LEGAL_UPDATED_AT })}>
      <p>{tr("Remind Me vous aide à organiser vos activités, votre agenda, vos tâches, vos objectifs et vos finances. Cette page explique quelles données nous utilisons, pourquoi, et comment vous gardez la main dessus. Elle s'applique au site et aux applications Android et iPhone.")}</p>

      <h2>{tr("1. Les données que nous utilisons")}</h2>
      <ul>
        <li>{tr("Compte : adresse e-mail, mot de passe (chiffré, jamais lisible par nous), prénom et nom, statut (étudiant, salarié, indépendant…), pays, devise, fuseau horaire et langue.")}</li>
        <li>{tr("Contenu que vous saisissez : activités, horaires, tâches, événements d'agenda, objectifs, revenus, dépenses, budgets, contacts et organisations.")}</li>
        <li>{tr("Photo de profil, si vous en ajoutez une.")}</li>
        <li>{tr("Notifications : si vous les acceptez, un identifiant technique de votre appareil sert uniquement à vous envoyer vos rappels.")}</li>
        <li>{tr("Paiement : si vous prenez un forfait sur le site, le paiement est traité par Bictorys (Wave, Orange Money, MTN, Moov). Nous ne voyons ni ne gardons vos numéros de carte ou de compte ; nous recevons seulement la confirmation du paiement.")}</li>
        <li>{tr("Mesure d'audience : des statistiques de visite anonymes (pages vues, type d'appareil), sans publicité ni profilage.")}</li>
      </ul>

      <h2>{tr("2. Pourquoi nous les utilisons")}</h2>
      <ul>
        <li>{tr("Faire fonctionner le service : afficher vos activités, calculer vos heures et vos revenus, vous envoyer vos rappels.")}</li>
        <li>{tr("Sécuriser votre compte et vous envoyer les e-mails indispensables (confirmation d'inscription, mot de passe oublié).")}</li>
        <li>{tr("Améliorer l'application à partir de statistiques globales et anonymes.")}</li>
      </ul>
      <p>{tr("Nous ne vendons jamais vos données. Nous ne les utilisons pas pour de la publicité.")}</p>

      <h2>{tr("3. Qui les héberge")}</h2>
      <p>{tr("Nous faisons appel à quelques prestataires techniques, chacun limité à son rôle :")}</p>
      <ul>
        <li>{tr("Supabase : base de données, connexion et stockage des fichiers.")}</li>
        <li>{tr("Vercel : hébergement du site et statistiques de visite anonymes.")}</li>
        <li>{tr("Resend : envoi des e-mails du service.")}</li>
        <li>{tr("Bictorys : paiement des forfaits sur le site.")}</li>
        <li>{tr("ElevenLabs : création de certaines phrases lues à voix haute. Le texte envoyé est un message de l'application, pas vos données personnelles.")}</li>
      </ul>

      <h2>{tr("4. Combien de temps")}</h2>
      <p>{tr("Vos données sont gardées tant que votre compte existe. Quand vous supprimez votre compte, elles sont effacées définitivement, sauf ce que la loi nous oblige à garder (par exemple une trace d'un paiement).")}</p>

      <h2>{tr("5. Vos droits")}</h2>
      <ul>
        <li>{tr("Consulter et corriger vos informations : dans Réglages, rubrique Profil.")}</li>
        <li>{tr("Effacer tout votre contenu en gardant le compte : Réglages, rubrique Données, « Réinitialiser mon compte ».")}</li>
        <li>{tr("Supprimer votre compte et toutes vos données : Réglages, rubrique Données, « Supprimer mon compte définitivement ».")}</li>
        <li>{tr("Refuser les notifications à tout moment, depuis l'application ou les réglages de votre téléphone.")}</li>
      </ul>
      <p>
        {tr("Toutes les étapes sont détaillées sur la page")} <Link href="/suppression-compte">{tr("Supprimer mon compte")}</Link>.
      </p>

      <h2>{tr("6. Sécurité")}</h2>
      <p>{tr("Les échanges sont chiffrés (HTTPS). Chaque compte ne peut lire que ses propres données. L'accès technique est limité au strict nécessaire.")}</p>

      <h2>{tr("7. Enfants")}</h2>
      <p>{tr("Remind Me ne s'adresse pas aux enfants de moins de 13 ans et ne collecte pas sciemment leurs données.")}</p>

      <h2>{tr("8. Nous contacter")}</h2>
      {SUPPORT_EMAIL ? (
        <p>
          {tr("Pour toute question sur vos données :")} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      ) : (
        <p>{tr("Pour toute question sur vos données, écrivez à l'adresse de contact indiquée sur la fiche de Remind Me dans l'App Store ou le Play Store.")}</p>
      )}
      <p>{tr("Si cette politique change, la date en haut de la page est mise à jour.")}</p>
    </LegalPage>
  );
}
