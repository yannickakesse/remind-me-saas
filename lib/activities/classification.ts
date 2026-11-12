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
    key: "business", label: "Entrepreneuriat et commerce", icon: "🏪", context: "votre entreprise",
    subs: [
      sub("entrepreneurship", "Gestion d'entreprise", "activité d'entreprise"),
      sub("trade", "Commerce et vente", "activité commerciale"),
      sub("purchasing", "Achats et approvisionnement", "achat professionnel"),
      sub("ecommerce", "E-commerce", "activité e-commerce"),
      sub("marketing", "Marketing et communication", "action marketing"),
      sub("customer_relations", "Relation client", "rendez-vous client"),
      sub("business_development", "Développement commercial", "rendez-vous commercial"),
      sub("project_management", "Gestion de projet", "point projet"),
      sub("investment", "Investissement", "rendez-vous investissement"),
    ],
  },
  {
    key: "services", label: "Services et prestations", icon: "🤝", context: "vos prestations",
    subs: [
      sub("consulting", "Conseil et consulting", "mission de conseil"),
      sub("service", "Prestation de services", "prestation"),
      sub("admin_assistance", "Assistance administrative", "assistance administrative"),
      sub("accounting", "Comptabilité et finance", "travail de comptabilité"),
      sub("hr", "Ressources humaines et recrutement", "activité RH"),
      sub("legal", "Juridique", "rendez-vous juridique"),
      sub("translation", "Traduction et interprétation", "mission de traduction"),
      sub("it", "Informatique et technologie", "mission informatique"),
      sub("maintenance", "Maintenance et dépannage", "intervention de maintenance"),
      sub("personal_services", "Services à la personne", "intervention à domicile"),
    ],
  },
  {
    key: "education", label: "Éducation et formation", icon: "🎓", context: "l'enseignement ou la formation",
    subs: [
      sub("teaching", "Enseignement", "cours"),
      sub("private_lessons", "Cours particuliers", "cours particulier"),
      sub("professional_training", "Formation professionnelle", "formation"),
      sub("coaching", "Coaching et mentorat", "séance de coaching"),
      sub("online_training", "Formation en ligne", "formation en ligne"),
      sub("studies", "Études et examens", "temps d'études"),
      sub("research", "Recherche", "travail de recherche"),
      sub("conference", "Conférence et séminaire", "conférence"),
    ],
  },
  {
    key: "career", label: "Emploi et carrière", icon: "💼", context: "votre travail",
    subs: [
      sub("salaried_work", "Travail salarié", "journée de travail"),
      sub("work_meeting", "Réunion professionnelle", "réunion professionnelle"),
      sub("professional_appointment", "Rendez-vous professionnel", "rendez-vous professionnel"),
      sub("job_interview", "Entretien d'embauche", "entretien d'embauche"),
      sub("job_search", "Recherche d'emploi", "recherche d'emploi"),
      sub("mission", "Mission professionnelle", "mission"),
      sub("business_trip", "Déplacement professionnel", "déplacement professionnel"),
      sub("career_review", "Évaluation et carrière", "entretien d'évaluation"),
    ],
  },
  {
    key: "religion", label: "Religion et spiritualité", icon: "🙏", context: "votre vie spirituelle",
    subs: [
      sub("worship", "Culte", "culte"),
      sub("prayer", "Prière", "temps de prière"),
      sub("religious_meeting", "Réunion religieuse", "réunion religieuse"),
      sub("spiritual_study", "Étude biblique ou spirituelle", "étude spirituelle"),
      sub("evangelism", "Évangélisation", "sortie d'évangélisation"),
      sub("religious_community", "Activité communautaire religieuse", "activité de communauté"),
      sub("religious_event", "Événement religieux", "événement religieux"),
    ],
  },
  {
    key: "health", label: "Santé et bien-être", icon: "🩺", context: "votre santé",
    subs: [
      sub("medical_appointment", "Rendez-vous médical", "rendez-vous médical"),
      sub("care", "Soins", "séance de soins"),
      sub("sport", "Sport et fitness", "séance de sport"),
      sub("wellbeing", "Bien-être et détente", "moment de bien-être"),
      sub("nutrition", "Nutrition", "rendez-vous nutrition"),
      sub("health_tracking", "Suivi de santé", "suivi de santé"),
    ],
  },
  {
    key: "family", label: "Famille et vie personnelle", icon: "🏡", context: "votre vie personnelle",
    subs: [
      sub("family", "Famille", "moment en famille"),
      sub("couple", "Couple", "moment à deux"),
      sub("children", "Enfants", "activité avec les enfants"),
      sub("household", "Maison et vie domestique", "tâche à la maison"),
      sub("shopping", "Courses et achats", "sortie de courses"),
      sub("personal_appointment", "Rendez-vous personnel", "rendez-vous personnel"),
      sub("leisure", "Loisirs et vacances", "moment de loisir"),
      sub("personal_development", "Développement personnel", "temps de développement personnel"),
    ],
  },
  {
    key: "admin", label: "Administration et démarches", icon: "📑", context: "vos démarches",
    subs: [
      sub("procedures", "Démarches administratives", "démarche administrative"),
      sub("bank", "Banque", "rendez-vous à la banque"),
      sub("insurance", "Assurance", "rendez-vous d'assurance"),
      sub("taxes", "Impôts et fiscalité", "démarche fiscale"),
      sub("payments", "Paiements", "paiement à effectuer"),
      sub("institutional_appointment", "Rendez-vous institutionnel", "rendez-vous administratif"),
    ],
  },
  {
    key: "community", label: "Associations et vie communautaire", icon: "👥", context: "votre engagement associatif",
    subs: [
      sub("association", "Association et ONG", "activité associative"),
      sub("volunteering", "Bénévolat", "mission de bénévolat"),
      sub("association_meeting", "Réunion associative", "réunion associative"),
      sub("social_action", "Action sociale", "action sociale"),
      sub("community_event", "Événement communautaire", "événement communautaire"),
    ],
  },
  {
    key: "culture", label: "Culture, médias et création", icon: "🎨", context: "vos créations",
    subs: [
      sub("content_creation", "Création de contenu", "création de contenu"),
      sub("photo_video", "Photo et vidéo", "tournage"),
      sub("music", "Musique", "séance de musique"),
      sub("art", "Art et écriture", "temps de création"),
      sub("cultural_event", "Événement culturel", "événement culturel"),
      sub("media", "Médias et divertissement", "activité médias"),
    ],
  },
  {
    key: "real_estate", label: "Immobilier, construction et habitat", icon: "🏗️", context: "vos projets immobiliers",
    subs: [
      sub("real_estate", "Immobilier (achat, vente, location)", "rendez-vous immobilier"),
      sub("property_management", "Gestion immobilière", "gestion de biens"),
      sub("construction", "Construction et travaux", "suivi de chantier"),
      sub("architecture", "Architecture et décoration", "rendez-vous d'architecture"),
    ],
  },
  {
    key: "transport", label: "Transport et logistique", icon: "🚚", context: "vos déplacements",
    subs: [
      sub("transport", "Transport", "transport"),
      sub("delivery", "Livraison et expédition", "livraison"),
      sub("logistics", "Logistique et flotte", "opération logistique"),
      sub("travel", "Voyage et déplacement", "voyage"),
    ],
  },
  {
    key: "agriculture", label: "Agriculture et environnement", icon: "🌱", context: "votre exploitation",
    subs: [
      sub("farming", "Agriculture", "travail agricole"),
      sub("livestock", "Élevage et pêche", "travail d'élevage"),
      sub("agrifood", "Agroalimentaire", "activité agroalimentaire"),
      sub("environment", "Environnement et développement durable", "action pour l'environnement"),
    ],
  },
  {
    key: "events", label: "Événements et organisation", icon: "🎉", context: "vos événements",
    subs: [
      sub("event_planning", "Organisation d'événements", "organisation d'événement"),
      sub("wedding", "Mariage", "mariage"),
      sub("birthday", "Anniversaire", "anniversaire"),
      sub("ceremony", "Cérémonie et réception", "cérémonie"),
      sub("trade_show", "Salon et exposition", "salon"),
      sub("meetup", "Rencontre", "rencontre"),
    ],
  },
  {
    key: "misc", label: "Projets personnels et divers", icon: "✨", context: "vos projets",
    subs: [
      sub("personal_project", "Projet personnel", "projet personnel"),
      sub("one_off", "Activité ponctuelle", "activité ponctuelle"),
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
      return "Non précisé";
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
