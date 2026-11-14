#!/usr/bin/env node
/**
 * Voix « domaine » v2 (français) : une phrase par secteur ET par type d'activité, plus la phrase « Autre ».
 * Ordre = ordre de lecture dans ElevenLabs = ordre de découpage. Génère docs/voix-domaines-v2-a-coller.txt.
 *   node scripts/voice-domains-v2.mjs
 * Fichiers attendus : public/voice/alerts/domain_<secteur>-fr.mp3 et domain_<secteur>__<type>-fr.mp3
 */
import fs from "node:fs";

export const DOMAIN_LINES_FR = [
  // ---- Secteurs (phrase jouée si l'utilisateur n'a choisi que le secteur)
  ["business", "Il s'agit d'une activité liée à votre entreprise."],
  ["services", "Il s'agit d'une activité liée à vos prestations de services."],
  ["education", "Il s'agit d'une activité liée à l'enseignement ou à la formation."],
  ["career", "Il s'agit d'une activité liée à votre emploi."],
  ["religion", "Il s'agit d'une activité liée au domaine de la religion."],
  ["health", "Il s'agit d'une activité liée à votre santé."],
  ["family", "Il s'agit d'une activité liée à votre vie de famille."],
  ["admin", "Il s'agit d'une activité liée à vos démarches administratives."],
  ["community", "Il s'agit d'une activité liée à votre association."],
  ["culture", "Il s'agit d'une activité liée à la culture et à la création."],
  ["real_estate", "Il s'agit d'une activité liée à l'immobilier."],
  ["transport", "Il s'agit d'une activité liée au transport."],
  ["agriculture", "Il s'agit d'une activité liée à l'agriculture."],
  ["events", "Il s'agit d'une activité liée à l'organisation d'un événement."],
  ["misc", "Il s'agit d'une activité liée à vos projets personnels."],
  ["beauty", "Il s'agit d'une activité liée à la beauté et à la mode."],
  ["food", "Il s'agit d'une activité liée à la restauration."],
  ["crafts", "Il s'agit d'une activité liée à l'artisanat."],
  ["finance", "Il s'agit d'une activité liée à vos finances."],
  ["other", "Il s'agit d'une activité que vous avez précisée vous-même."],

  // ---- Entrepreneuriat et commerce
  ["business__entrepreneurship", "Il s'agit de la gestion de votre entreprise."],
  ["business__trade", "Il s'agit d'une activité de vente."],
  ["business__purchasing", "Il s'agit d'un achat pour votre activité."],
  ["business__ecommerce", "Il s'agit de votre boutique en ligne."],
  ["business__marketing", "Il s'agit d'une action de marketing."],
  ["business__customer_relations", "Il s'agit d'un rendez-vous avec un client."],
  ["business__business_development", "Il s'agit d'un rendez-vous commercial."],
  ["business__project_management", "Il s'agit d'un point sur votre projet."],
  ["business__investment", "Il s'agit d'un rendez-vous sur vos investissements."],
  // ---- Services et prestations
  ["services__consulting", "Il s'agit d'une mission de conseil."],
  ["services__service", "Il s'agit d'une prestation pour un client."],
  ["services__admin_assistance", "Il s'agit d'une mission d'assistance administrative."],
  ["services__accounting", "Il s'agit d'un travail de comptabilité."],
  ["services__hr", "Il s'agit d'une activité de recrutement."],
  ["services__legal", "Il s'agit d'un rendez-vous juridique."],
  ["services__translation", "Il s'agit d'une mission de traduction."],
  ["services__it", "Il s'agit d'une mission informatique."],
  ["services__maintenance", "Il s'agit d'une intervention de dépannage."],
  ["services__personal_services", "Il s'agit d'une intervention à domicile."],
  // ---- Éducation et formation
  ["education__teaching", "Il s'agit d'un cours à donner."],
  ["education__private_lessons", "Il s'agit d'un cours particulier."],
  ["education__professional_training", "Il s'agit d'une formation professionnelle."],
  ["education__coaching", "Il s'agit d'une séance de coaching."],
  ["education__online_training", "Il s'agit d'une formation en ligne."],
  ["education__studies", "Il s'agit d'un temps d'études ou de révision."],
  ["education__research", "Il s'agit d'un travail de recherche."],
  ["education__conference", "Il s'agit d'une conférence ou d'un séminaire."],
  // ---- Emploi et carrière
  ["career__salaried_work", "Il s'agit de votre travail."],
  ["career__work_meeting", "Il s'agit d'une réunion de travail."],
  ["career__professional_appointment", "Il s'agit d'un rendez-vous professionnel."],
  ["career__job_interview", "Il s'agit d'un entretien d'embauche."],
  ["career__job_search", "Il s'agit de votre recherche d'emploi."],
  ["career__mission", "Il s'agit d'une mission professionnelle."],
  ["career__business_trip", "Il s'agit d'un déplacement professionnel."],
  ["career__career_review", "Il s'agit d'un entretien d'évaluation."],
  // ---- Religion et spiritualité
  ["religion__worship", "Il s'agit d'un culte."],
  ["religion__prayer", "Il s'agit d'un temps de prière."],
  ["religion__religious_meeting", "Il s'agit d'une réunion religieuse."],
  ["religion__spiritual_study", "Il s'agit d'une étude biblique ou spirituelle."],
  ["religion__evangelism", "Il s'agit d'une sortie d'évangélisation."],
  ["religion__religious_community", "Il s'agit d'une activité de votre communauté religieuse."],
  ["religion__religious_event", "Il s'agit d'un événement religieux."],
  // ---- Santé et bien-être
  ["health__medical_appointment", "Il s'agit d'un rendez-vous médical."],
  ["health__care", "Il s'agit d'une séance de soins."],
  ["health__sport", "Il s'agit d'une séance de sport."],
  ["health__wellbeing", "Il s'agit d'un moment de détente."],
  ["health__nutrition", "Il s'agit d'un rendez-vous de nutrition."],
  ["health__health_tracking", "Il s'agit du suivi de votre santé."],
  // ---- Famille et vie personnelle
  ["family__family", "Il s'agit d'un moment en famille."],
  ["family__couple", "Il s'agit d'un moment à deux."],
  ["family__children", "Il s'agit d'une activité avec vos enfants."],
  ["family__household", "Il s'agit d'une tâche à la maison."],
  ["family__shopping", "Il s'agit de vos courses."],
  ["family__personal_appointment", "Il s'agit d'un rendez-vous personnel."],
  ["family__leisure", "Il s'agit d'un moment de loisir."],
  ["family__personal_development", "Il s'agit de votre développement personnel."],
  // ---- Administration et démarches
  ["admin__procedures", "Il s'agit d'une démarche administrative."],
  ["admin__bank", "Il s'agit d'un rendez-vous à la banque."],
  ["admin__insurance", "Il s'agit d'un rendez-vous d'assurance."],
  ["admin__taxes", "Il s'agit de vos impôts."],
  ["admin__payments", "Il s'agit d'un paiement à effectuer."],
  ["admin__institutional_appointment", "Il s'agit d'un rendez-vous dans une administration."],
  // ---- Associations et vie communautaire
  ["community__association", "Il s'agit d'une activité de votre association."],
  ["community__volunteering", "Il s'agit d'une mission de bénévolat."],
  ["community__association_meeting", "Il s'agit d'une réunion d'association."],
  ["community__social_action", "Il s'agit d'une action sociale."],
  ["community__community_event", "Il s'agit d'un événement de votre communauté."],
  // ---- Culture, médias et création
  ["culture__content_creation", "Il s'agit de la création de contenu."],
  ["culture__photo_video", "Il s'agit d'un tournage ou d'une séance photo."],
  ["culture__music", "Il s'agit d'une séance de musique."],
  ["culture__art", "Il s'agit d'un temps de création artistique."],
  ["culture__cultural_event", "Il s'agit d'un événement culturel."],
  ["culture__media", "Il s'agit d'une activité dans les médias."],
  // ---- Immobilier, construction et habitat
  ["real_estate__real_estate", "Il s'agit d'un rendez-vous immobilier."],
  ["real_estate__property_management", "Il s'agit de la gestion de vos biens."],
  ["real_estate__construction", "Il s'agit du suivi d'un chantier."],
  ["real_estate__architecture", "Il s'agit d'un rendez-vous d'architecture ou de décoration."],
  // ---- Transport et logistique
  ["transport__transport", "Il s'agit d'un transport."],
  ["transport__delivery", "Il s'agit d'une livraison."],
  ["transport__logistics", "Il s'agit d'une opération de logistique."],
  ["transport__travel", "Il s'agit d'un voyage."],
  // ---- Agriculture et environnement
  ["agriculture__farming", "Il s'agit d'un travail aux champs."],
  ["agriculture__livestock", "Il s'agit d'un travail d'élevage ou de pêche."],
  ["agriculture__agrifood", "Il s'agit d'une activité de transformation alimentaire."],
  ["agriculture__environment", "Il s'agit d'une action pour l'environnement."],
  // ---- Événements et organisation
  ["events__event_planning", "Il s'agit de l'organisation d'un événement."],
  ["events__wedding", "Il s'agit d'un mariage."],
  ["events__birthday", "Il s'agit d'un anniversaire."],
  ["events__ceremony", "Il s'agit d'une cérémonie."],
  ["events__trade_show", "Il s'agit d'un salon ou d'une exposition."],
  ["events__meetup", "Il s'agit d'une rencontre."],
  // ---- Projets personnels et divers
  ["misc__personal_project", "Il s'agit de votre projet personnel."],
  ["misc__one_off", "Il s'agit d'une activité ponctuelle."],
  // ---- NOUVEAU : Beauté et mode
  ["beauty__hairdressing", "Il s'agit d'un rendez-vous de coiffure."],
  ["beauty__beauty_care", "Il s'agit d'un soin de beauté."],
  ["beauty__sewing", "Il s'agit d'un travail de couture."],
  ["beauty__fashion", "Il s'agit d'une activité de mode."],
  // ---- NOUVEAU : Restauration et alimentation
  ["food__restaurant", "Il s'agit du service de votre restaurant."],
  ["food__catering", "Il s'agit d'une commande de traiteur."],
  ["food__pastry", "Il s'agit d'une préparation de pâtisserie."],
  ["food__food_sales", "Il s'agit d'une vente de nourriture."],
  // ---- NOUVEAU : Artisanat et métiers manuels
  ["crafts__carpentry", "Il s'agit d'un travail de menuiserie."],
  ["crafts__mechanics", "Il s'agit d'une réparation mécanique."],
  ["crafts__electricity", "Il s'agit d'un travail d'électricité."],
  ["crafts__plumbing", "Il s'agit d'un travail de plomberie."],
  ["crafts__handcraft", "Il s'agit d'une création artisanale."],
  // ---- NOUVEAU : Argent et finances personnelles
  ["finance__tontine", "Il s'agit de votre tontine."],
  ["finance__savings", "Il s'agit de votre épargne."],
  ["finance__loan", "Il s'agit d'un remboursement de prêt."],
  ["finance__money_transfer", "Il s'agit d'un transfert d'argent."],
];

// Trois blocs de taille raisonnable (une génération ElevenLabs chacun)
const BLOCKS = [[0, 48], [48, 96], [96, DOMAIN_LINES_FR.length]];

if (process.argv[1] && process.argv[1].endsWith("voice-domains-v2.mjs")) {
  const keys = new Set();
  for (const [k] of DOMAIN_LINES_FR) {
    if (keys.has(k)) throw new Error("Clé en double : " + k);
    keys.add(k);
  }
  let out = `REMIND ME — VOIX « DOMAINE » V2 — FRANÇAIS (${DOMAIN_LINES_FR.length} phrases, 3 blocs)
Collez chaque bloc tel quel dans ElevenLabs (voix Lauren) et générez UN fichier par bloc.
Le découpage et le nommage des fichiers sont faits ensuite automatiquement.
`;
  BLOCKS.forEach(([a, b], i) => {
    const lines = DOMAIN_LINES_FR.slice(a, b).map(([, t]) => t);
    out += `\n=============== BLOC ${i + 1} (${lines.length} phrases, ${lines.join("\n").length} caractères) ===============\n${lines.join("\n")}\n`;
  });
  out += `\n=============== CORRESPONDANCE (ordre = ordre de découpage) ===============\n`;
  DOMAIN_LINES_FR.forEach(([k, t], i) => (out += `${String(i + 1).padStart(3)}. domain_${k}-fr.mp3  →  ${t}\n`));
  fs.writeFileSync("docs/voix-domaines-v2-a-coller.txt", out);
  console.log(DOMAIN_LINES_FR.length, "phrases ; blocs :", BLOCKS.map(([a, b]) => DOMAIN_LINES_FR.slice(a, b).map(([, t]) => t).join("\n").length).join(" / "), "caractères");
}
