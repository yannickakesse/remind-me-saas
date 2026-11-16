/**
 * Classification des activités en deux niveaux : secteur (domaine) → type d'activité.
 *
 * Stockage : la colonne existante `activities.category` (texte libre, jamais remplie jusqu'ici).
 * Aucune nouvelle colonne, aucune migration : la valeur suit un format lisible et rétrocompatible.
 *
 *   "religion"                 → secteur seul
 *   "religion/religious_meeting" → secteur + type d'activité
 *   "other:Club de lecture"    → « Autre », précisé librement par l'utilisateur
 *   "unspecified"              → « Non précisé » (choix explicite)
 *   null / ""                  → pas encore classée (anciennes activités : comportement inchangé)
 *   tout autre texte           → ancienne saisie libre, conservée et affichée telle quelle
 *
 * `spoken` = groupe nominal utilisé par la voix après « votre » (« votre réunion religieuse »).
 * `context` = complément d'un secteur seul (« une activité liée à votre entreprise »).
 */

import { msg } from "@/lib/i18n/catalog";
export interface ActivitySubcategory {
  key: string;
  label: string;
  spoken: string;
}

export interface ActivitySector {
  key: string;
  label: string;
  icon: string;
  context: string;
  subs: ActivitySubcategory[];
}

const sub = (key: string, label: string, spoken?: string): ActivitySubcategory => ({ key, label, spoken: spoken ?? label.toLowerCase() });

export const ACTIVITY_SECTORS: ActivitySector[] = [
  {
    key: "business", label: msg("Entrepreneuriat et commerce"), icon: "🏪", context: "votre entreprise",
    subs: [
      sub("entrepreneurship", msg("Gestion d'entreprise"), "activité d'entreprise"),
      sub("trade", msg("Commerce et vente"), "activité commerciale"),
      sub("purchasing", msg("Achats et approvisionnement"), "achat professionnel"),
      sub("ecommerce", msg("E-commerce"), "activité e-commerce"),
      sub("marketing", msg("Marketing et communication"), "action marketing"),
      sub("customer_relations", msg("Relation client"), "rendez-vous client"),
      sub("business_development", msg("Développement commercial"), "rendez-vous commercial"),
      sub("project_management", msg("Gestion de projet"), "point projet"),
      sub("investment", msg("Investissement"), "rendez-vous investissement"),
    ],
  },
  {
    key: "services", label: msg("Services et prestations"), icon: "🤝", context: "vos prestations",
    subs: [
      sub("consulting", msg("Conseil et consulting"), "mission de conseil"),
      sub("service", msg("Prestation de services"), "prestation"),
      sub("admin_assistance", msg("Assistance administrative"), "assistance administrative"),
      sub("accounting", msg("Comptabilité et finance"), "travail de comptabilité"),
      sub("hr", msg("Ressources humaines et recrutement"), "activité RH"),
      sub("legal", msg("Juridique"), "rendez-vous juridique"),
      sub("translation", msg("Traduction et interprétation"), "mission de traduction"),
      sub("it", msg("Informatique et technologie"), "mission informatique"),
      sub("maintenance", msg("Maintenance et dépannage"), "intervention de maintenance"),
      sub("personal_services", msg("Services à la personne"), "intervention à domicile"),
    ],
  },
  {
    key: "education", label: msg("Éducation et formation"), icon: "🎓", context: "l'enseignement ou la formation",
    subs: [
      sub("teaching", msg("Enseignement"), "cours"),
      sub("private_lessons", msg("Cours particuliers"), "cours particulier"),
      sub("professional_training", msg("Formation professionnelle"), "formation"),
      sub("coaching", msg("Coaching et mentorat"), "séance de coaching"),
      sub("online_training", msg("Formation en ligne"), "formation en ligne"),
      sub("studies", msg("Études et examens"), "temps d'études"),
      sub("research", msg("Recherche"), "travail de recherche"),
      sub("conference", msg("Conférence et séminaire"), "conférence"),
    ],
  },
  {
    key: "career", label: msg("Emploi et carrière"), icon: "💼", context: "votre travail",
    subs: [
      sub("salaried_work", msg("Travail salarié"), "journée de travail"),
      sub("work_meeting", msg("Réunion professionnelle"), "réunion professionnelle"),
      sub("professional_appointment", msg("Rendez-vous professionnel"), "rendez-vous professionnel"),
      sub("job_interview", msg("Entretien d'embauche"), "entretien d'embauche"),
      sub("job_search", msg("Recherche d'emploi"), "recherche d'emploi"),
      sub("mission", msg("Mission professionnelle"), "mission"),
      sub("business_trip", msg("Déplacement professionnel"), "déplacement professionnel"),
      sub("career_review", msg("Évaluation et carrière"), "entretien d'évaluation"),
    ],
  },
  {
    key: "religion", label: msg("Religion et spiritualité"), icon: "🙏", context: "votre vie spirituelle",
    subs: [
      sub("worship", msg("Culte"), "culte"),
      sub("prayer", msg("Prière"), "temps de prière"),
      sub("religious_meeting", msg("Réunion religieuse"), "réunion religieuse"),
      sub("spiritual_study", msg("Étude biblique ou spirituelle"), "étude spirituelle"),
      sub("evangelism", msg("Évangélisation"), "sortie d'évangélisation"),
      sub("religious_community", msg("Activité communautaire religieuse"), "activité de communauté"),
      sub("religious_event", msg("Événement religieux"), "événement religieux"),
    ],
  },
  {
    key: "health", label: msg("Santé et bien-être"), icon: "🩺", context: "votre santé",
    subs: [
      sub("medical_appointment", msg("Rendez-vous médical"), "rendez-vous médical"),
      sub("care", msg("Soins"), "séance de soins"),
      sub("sport", msg("Sport et fitness"), "séance de sport"),
      sub("wellbeing", msg("Bien-être et détente"), "moment de bien-être"),
      sub("nutrition", msg("Nutrition"), "rendez-vous nutrition"),
      sub("health_tracking", msg("Suivi de santé"), "suivi de santé"),
    ],
  },
  {
    key: "family", label: msg("Famille et vie personnelle"), icon: "🏡", context: "votre vie personnelle",
    subs: [
      sub("family", msg("Famille"), "moment en famille"),
      sub("couple", msg("Couple"), "moment à deux"),
      sub("children", msg("Enfants"), "activité avec les enfants"),
      sub("household", msg("Maison et vie domestique"), "tâche à la maison"),
      sub("shopping", msg("Courses et achats"), "sortie de courses"),
      sub("personal_appointment", msg("Rendez-vous personnel"), "rendez-vous personnel"),
      sub("leisure", msg("Loisirs et vacances"), "moment de loisir"),
      sub("personal_development", msg("Développement personnel"), "temps de développement personnel"),
    ],
  },
  {
    key: "admin", label: msg("Administration et démarches"), icon: "📑", context: "vos démarches",
    subs: [
      sub("procedures", msg("Démarches administratives"), "démarche administrative"),
      sub("bank", msg("Banque"), "rendez-vous à la banque"),
      sub("insurance", msg("Assurance"), "rendez-vous d'assurance"),
      sub("taxes", msg("Impôts et fiscalité"), "démarche fiscale"),
      sub("payments", msg("Paiements"), "paiement à effectuer"),
      sub("institutional_appointment", msg("Rendez-vous institutionnel"), "rendez-vous administratif"),
    ],
  },
  {
    key: "community", label: msg("Associations et vie communautaire"), icon: "👥", context: "votre engagement associatif",
    subs: [
      sub("association", msg("Association et ONG"), "activité associative"),
      sub("volunteering", msg("Bénévolat"), "mission de bénévolat"),
      sub("association_meeting", msg("Réunion associative"), "réunion associative"),
      sub("social_action", msg("Action sociale"), "action sociale"),
      sub("community_event", msg("Événement communautaire"), "événement communautaire"),
    ],
  },
  {
    key: "culture", label: msg("Culture, médias et création"), icon: "🎨", context: "vos créations",
    subs: [
      sub("content_creation", msg("Création de contenu"), "création de contenu"),
      sub("photo_video", msg("Photo et vidéo"), "tournage"),
      sub("music", msg("Musique"), "séance de musique"),
      sub("art", msg("Art et écriture"), "temps de création"),
      sub("cultural_event", msg("Événement culturel"), "événement culturel"),
      sub("media", msg("Médias et divertissement"), "activité médias"),
    ],
  },
  {
    key: "real_estate", label: msg("Immobilier, construction et habitat"), icon: "🏗️", context: "vos projets immobiliers",
    subs: [
      sub("real_estate", msg("Immobilier (achat, vente, location)"), "rendez-vous immobilier"),
      sub("property_management", msg("Gestion immobilière"), "gestion de biens"),
      sub("construction", msg("Construction et travaux"), "suivi de chantier"),
      sub("architecture", msg("Architecture et décoration"), "rendez-vous d'architecture"),
    ],
  },
  {
    key: "transport", label: msg("Transport et logistique"), icon: "🚚", context: "vos déplacements",
    subs: [
      sub("transport", msg("Transport"), "transport"),
      sub("delivery", msg("Livraison et expédition"), "livraison"),
      sub("logistics", msg("Logistique et flotte"), "opération logistique"),
      sub("travel", msg("Voyage et déplacement"), "voyage"),
    ],
  },
  {
    key: "agriculture", label: msg("Agriculture et environnement"), icon: "🌱", context: "votre exploitation",
    subs: [
      sub("farming", msg("Agriculture"), "travail agricole"),
      sub("livestock", msg("Élevage et pêche"), "travail d'élevage"),
      sub("agrifood", msg("Agroalimentaire"), "activité agroalimentaire"),
      sub("environment", msg("Environnement et développement durable"), "action pour l'environnement"),
    ],
  },
  {
    key: "events", label: msg("Événements et organisation"), icon: "🎉", context: "vos événements",
    subs: [
      sub("event_planning", msg("Organisation d'événements"), "organisation d'événement"),
      sub("wedding", msg("Mariage"), "mariage"),
      sub("birthday", msg("Anniversaire"), "anniversaire"),
      sub("ceremony", msg("Cérémonie et réception"), "cérémonie"),
      sub("trade_show", msg("Salon et exposition"), "salon"),
      sub("meetup", msg("Rencontre"), "rencontre"),
    ],
  },
  {
    key: "beauty", label: msg("Beauté, couture et mode"), icon: "💇", context: "la beauté et la mode",
    subs: [
      sub("hairdressing", msg("Coiffure"), "rendez-vous de coiffure"),
      sub("beauty_care", msg("Soins de beauté et esthétique"), "soin de beauté"),
      sub("sewing", msg("Couture"), "travail de couture"),
      sub("fashion", msg("Mode et stylisme"), "activité de mode"),
    ],
  },
  {
    key: "food", label: msg("Restauration et alimentation"), icon: "🍽️", context: "la restauration",
    subs: [
      sub("restaurant", msg("Restaurant et maquis"), "service au restaurant"),
      sub("catering", msg("Traiteur"), "commande de traiteur"),
      sub("pastry", msg("Pâtisserie et boulangerie"), "préparation de pâtisserie"),
      sub("food_sales", msg("Vente de nourriture"), "vente de nourriture"),
    ],
  },
  {
    key: "crafts", label: msg("Artisanat et métiers techniques"), icon: "🛠️", context: "l'artisanat",
    subs: [
      sub("carpentry", msg("Menuiserie"), "travail de menuiserie"),
      sub("mechanics", msg("Mécanique"), "réparation mécanique"),
      sub("electricity", msg("Électricité"), "travail d'électricité"),
      sub("plumbing", msg("Plomberie"), "travail de plomberie"),
      sub("handcraft", msg("Création artisanale"), "création artisanale"),
    ],
  },
  {
    key: "finance", label: msg("Finances personnelles et tontines"), icon: "💰", context: "vos finances",
    subs: [
      sub("tontine", msg("Tontine"), "tontine"),
      sub("savings", msg("Épargne"), "épargne"),
      sub("loan", msg("Remboursement de prêt"), "remboursement de prêt"),
      sub("money_transfer", msg("Transfert d'argent"), "transfert d'argent"),
    ],
  },
  {
    key: "misc", label: msg("Projets personnels et divers"), icon: "✨", context: "vos projets",
    subs: [
      sub("personal_project", msg("Projet personnel"), "projet personnel"),
      sub("one_off", msg("Activité ponctuelle"), "activité ponctuelle"),
    ],
  },
];

export const OTHER_PREFIX = "other:";
export const UNSPECIFIED = "unspecified";

export type ParsedCategory =
  | { kind: "none" }
  | { kind: "unspecified" }
  | { kind: "other"; text: string }
  | { kind: "sector"; sector: ActivitySector; sub: ActivitySubcategory | null }
  | { kind: "legacy"; text: string };

const SECTOR_BY_KEY = new Map(ACTIVITY_SECTORS.map((s) => [s.key, s]));

/** Lit la valeur stockée dans `activities.category`. Ne lève jamais d'erreur. */
export function parseActivityCategory(value: string | null | undefined): ParsedCategory {
  const v = (value ?? "").trim();
  if (!v) return { kind: "none" };
  if (v === UNSPECIFIED) return { kind: "unspecified" };
  if (v.startsWith(OTHER_PREFIX)) {
    const text = v.slice(OTHER_PREFIX.length).trim();
    return text ? { kind: "other", text } : { kind: "unspecified" };
  }
  const [sectorKey, subKey] = v.split("/");
  const sector = SECTOR_BY_KEY.get(sectorKey ?? "");
  if (!sector) return { kind: "legacy", text: v };
  const subcat = subKey ? sector.subs.find((s) => s.key === subKey) ?? null : null;
  return { kind: "sector", sector, sub: subcat };
}

/** Construit la valeur à stocker (null = non classée). */
export function buildActivityCategory(sectorKey: string | null, subKey?: string | null, otherText?: string | null): string | null {
  if (!sectorKey) return null;
  if (sectorKey === UNSPECIFIED) return UNSPECIFIED;
  if (sectorKey === "other") {
    const t = (otherText ?? "").trim().slice(0, 80);
    return t ? `${OTHER_PREFIX}${t}` : UNSPECIFIED;
  }
  const sector = SECTOR_BY_KEY.get(sectorKey);
  if (!sector) return null;
  const subcat = subKey ? sector.subs.find((s) => s.key === subKey) : null;
  return subcat ? `${sector.key}/${subcat.key}` : sector.key;
}

/** Libellé court pour l'interface (« Religion et spiritualité · Réunion religieuse »). null si non classée. */
export function activityCategoryLabel(value: string | null | undefined): string | null {
  const p = parseActivityCategory(value);
  switch (p.kind) {
    case "sector":
      return p.sub ? `${p.sector.label} · ${p.sub.label}` : p.sector.label;
    case "other":
      return p.text;
    case "legacy":
      return p.text;
    case "unspecified":
      return msg("Non précisé");
    default:
      return null;
  }
}

/**
 * Contexte parlé d'une activité pour les rappels (français) :
 *  - type précis → { possessive: "votre réunion religieuse" }
 *  - secteur seul → { sectorContext: "votre entreprise" }
 *  - « Autre » précisé → { possessive: "votre activité « Club de lecture » » } n'est pas utilisé : on reste sur le titre.
 */
export function spokenActivityContext(value: string | null | undefined): { possessive?: string; sectorContext?: string } {
  const p = parseActivityCategory(value);
  if (p.kind !== "sector") return {};
  if (p.sub) return { possessive: `votre ${p.sub.spoken}` };
  return { sectorContext: p.sector.context };
}

/** Clé du secteur (pour la voix « domaine » préenregistrée), ou null si non classée / « Autre ». */
export function activitySectorKey(value: string | null | undefined): string | null {
  const p = parseActivityCategory(value);
  return p.kind === "sector" ? p.sector.key : null;
}

/**
 * Clé de la voix « domaine » préenregistrée (v2, scripts/voice-domains-v2.mjs) :
 *  - type précis   → "religion__worship"  (« Il s'agit d'un culte. »)
 *  - secteur seul  → "religion"           (« Il s'agit d'une activité liée au domaine de la religion. »)
 *  - « Autre »     → "other"              (« Il s'agit d'une activité que vous avez précisée vous-même. »)
 *  - non précisé, non classée ou ancienne saisie libre → null (rien n'est ajouté)
 */
export function activityDomainVoiceKey(value: string | null | undefined): string | null {
  const p = parseActivityCategory(value);
  if (p.kind === "other") return "other";
  if (p.kind !== "sector") return null;
  return p.sub ? `${p.sector.key}__${p.sub.key}` : p.sector.key;
}

/** Phrase de la voix « domaine », enregistrée une fois par secteur (docs/voix-domaines-a-coller.txt). */
export function domainVoiceSentenceFr(sectorKey: string): string | null {
  const s = SECTOR_BY_KEY.get(sectorKey);
  return s ? `Il s'agit d'une activité liée à ${s.context}.` : null;
}

/** Début de phrase écrite pour un rappel (« Votre réunion religieuse », « Votre activité liée à votre entreprise »), ou null. */
export function activityContextPhrase(value: string | null | undefined): string | null {
  const ctx = spokenActivityContext(value);
  if (ctx.possessive) return ctx.possessive.charAt(0).toUpperCase() + ctx.possessive.slice(1);
  if (ctx.sectorContext) return `Votre activité liée à ${ctx.sectorContext}`;
  return null;
}

/** Recherche (sans accents, insensible à la casse) dans les secteurs et types d'activité. */
export function searchActivityCategories(query: string): Array<{ sector: ActivitySector; sub: ActivitySubcategory | null }> {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = norm(query.trim());
  if (!q) return [];
  const out: Array<{ sector: ActivitySector; sub: ActivitySubcategory | null }> = [];
  for (const sector of ACTIVITY_SECTORS) {
    if (norm(sector.label).includes(q)) out.push({ sector, sub: null });
    for (const s of sector.subs) {
      if (norm(s.label).includes(q) || norm(s.spoken).includes(q)) out.push({ sector, sub: s });
    }
  }
  return out.slice(0, 12);
}
