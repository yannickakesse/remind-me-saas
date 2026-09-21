export interface TimezoneOption {
  value: string;
  label: string;
  region: string;
  offset: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // Afrique de l'Ouest & Centrale (Priorité)
  {
    value: "Africa/Abidjan",
    label: "Africa/Abidjan — Côte d'Ivoire",
    region: "Afrique de l'Ouest",
    offset: "GMT+0",
  },
  {
    value: "Africa/Dakar",
    label: "Africa/Dakar — Sénégal",
    region: "Afrique de l'Ouest",
    offset: "GMT+0",
  },
  {
    value: "Africa/Bamako",
    label: "Africa/Bamako — Mali",
    region: "Afrique de l'Ouest",
    offset: "GMT+0",
  },
  {
    value: "Africa/Ouagadougou",
    label: "Africa/Ouagadougou — Burkina Faso",
    region: "Afrique de l'Ouest",
    offset: "GMT+0",
  },
  {
    value: "Africa/Accra",
    label: "Africa/Accra — Ghana",
    region: "Afrique de l'Ouest",
    offset: "GMT+0",
  },
  {
    value: "Africa/Lome",
    label: "Africa/Lome — Togo",
    region: "Afrique de l'Ouest",
    offset: "GMT+0",
  },
  {
    value: "Africa/Cotonou",
    label: "Africa/Cotonou — Bénin",
    region: "Afrique de l'Ouest",
    offset: "GMT+1",
  },
  {
    value: "Africa/Lagos",
    label: "Africa/Lagos — Nigeria",
    region: "Afrique de l'Ouest",
    offset: "GMT+1",
  },
  {
    value: "Africa/Douala",
    label: "Africa/Douala — Cameroun",
    region: "Afrique Centrale",
    offset: "GMT+1",
  },
  {
    value: "Africa/Libreville",
    label: "Africa/Libreville — Gabon",
    region: "Afrique Centrale",
    offset: "GMT+1",
  },
  {
    value: "Africa/Brazzaville",
    label: "Africa/Brazzaville — Congo",
    region: "Afrique Centrale",
    offset: "GMT+1",
  },
  {
    value: "Africa/Kinshasa",
    label: "Africa/Kinshasa — RD Congo",
    region: "Afrique Centrale",
    offset: "GMT+1",
  },
  {
    value: "Africa/Casablanca",
    label: "Africa/Casablanca — Maroc",
    region: "Afrique du Nord",
    offset: "GMT+1",
  },
  {
    value: "Africa/Tunis",
    label: "Africa/Tunis — Tunisie",
    region: "Afrique du Nord",
    offset: "GMT+1",
  },
  {
    value: "Africa/Algiers",
    label: "Africa/Algiers — Algérie",
    region: "Afrique du Nord",
    offset: "GMT+1",
  },
  {
    value: "Africa/Nairobi",
    label: "Africa/Nairobi — Kenya",
    region: "Afrique de l'Est",
    offset: "GMT+3",
  },
  {
    value: "Africa/Johannesburg",
    label: "Africa/Johannesburg — Afrique du Sud",
    region: "Afrique Australe",
    offset: "GMT+2",
  },

  // Europe
  {
    value: "Europe/Paris",
    label: "Europe/Paris — France (Paris)",
    region: "Europe",
    offset: "GMT+1 / GMT+2",
  },
  {
    value: "Europe/Brussels",
    label: "Europe/Brussels — Belgique (Bruxelles)",
    region: "Europe",
    offset: "GMT+1 / GMT+2",
  },
  {
    value: "Europe/Geneva",
    label: "Europe/Geneva — Suisse (Genève)",
    region: "Europe",
    offset: "GMT+1 / GMT+2",
  },
  {
    value: "Europe/London",
    label: "Europe/London — Royaume-Uni (Londres)",
    region: "Europe",
    offset: "GMT+0 / GMT+1",
  },

  // Amérique & Outre-mer
  {
    value: "America/Montreal",
    label: "America/Montreal — Canada (Montréal)",
    region: "Amérique du Nord",
    offset: "GMT-5 / GMT-4",
  },
  {
    value: "America/New_York",
    label: "America/New_York — États-Unis (New York)",
    region: "Amérique du Nord",
    offset: "GMT-5 / GMT-4",
  },
  {
    value: "America/Chicago",
    label: "America/Chicago — États-Unis (Chicago)",
    region: "Amérique du Nord",
    offset: "GMT-6 / GMT-5",
  },
  {
    value: "America/Los_Angeles",
    label: "America/Los_Angeles — États-Unis (Los Angeles)",
    region: "Amérique du Nord",
    offset: "GMT-8 / GMT-7",
  },
  {
    value: "America/Guadeloupe",
    label: "America/Guadeloupe — Guadeloupe",
    region: "Antilles",
    offset: "GMT-4",
  },
  {
    value: "America/Martinique",
    label: "America/Martinique — Martinique",
    region: "Antilles",
    offset: "GMT-4",
  },
  {
    value: "America/Cayenne",
    label: "America/Cayenne — Guyane",
    region: "Amérique du Sud",
    offset: "GMT-3",
  },

  // Océan Indien & Moyen-Orient
  {
    value: "Indian/Reunion",
    label: "Indian/Reunion — La Réunion",
    region: "Océan Indien",
    offset: "GMT+4",
  },
  {
    value: "Indian/Mauritius",
    label: "Indian/Mauritius — Île Maurice",
    region: "Océan Indien",
    offset: "GMT+4",
  },
  {
    value: "Asia/Dubai",
    label: "Asia/Dubai — Émirats Arabes Unis (Dubaï)",
    region: "Moyen-Orient",
    offset: "GMT+4",
  },
  {
    value: "UTC",
    label: "UTC — Temps Universel Coordonné",
    region: "Universel",
    offset: "GMT+0",
  },
];

/**
 * Détermine le fuseau horaire par défaut approprié selon le pays ou le navigateur.
 * Si le pays est la Côte d'Ivoire ("CI") ou si le fuseau détecté est indésirable (ex: Atlantic/Reykjavik),
 * retourne "Africa/Abidjan".
 */
export function resolveAppropriateTimezone(
  countryCode?: string | null,
  detectedTimezone?: string | null
): string {
  if (countryCode === "CI") return "Africa/Abidjan";
  if (countryCode === "SN") return "Africa/Dakar";
  if (countryCode === "ML") return "Africa/Bamako";
  if (countryCode === "BF") return "Africa/Ouagadougou";
  if (countryCode === "TG") return "Africa/Lome";
  if (countryCode === "BJ") return "Africa/Cotonou";
  if (countryCode === "CM") return "Africa/Douala";
  if (countryCode === "FR") return "Europe/Paris";

  if (!detectedTimezone || detectedTimezone === "Atlantic/Reykjavik" || detectedTimezone === "UTC") {
    return "Africa/Abidjan";
  }

  // Vérifie si le timezone existe dans notre liste ou est valide
  const exists = TIMEZONE_OPTIONS.some((t) => t.value === detectedTimezone);
  if (exists) return detectedTimezone;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: detectedTimezone });
    return detectedTimezone;
  } catch {
    return "Africa/Abidjan";
  }
}

/**
 * Extrait le fuseau horaire de l'utilisateur à partir de son profil avec fallback sécurisé sur Africa/Abidjan.
 */
export function getUserTimezone(
  profile?: { country_code?: string | null; timezone?: string | null } | null
): string {
  return resolveAppropriateTimezone(profile?.country_code, profile?.timezone);
}

