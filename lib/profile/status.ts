import { msg } from "@/lib/i18n/catalog";

/**
 * Statut de l'utilisateur (« Vous êtes… »), choisi à l'inscription (colonne profiles.status, migration 0032).
 * Sert à adapter l'application et aux statistiques du tableau de bord fondateur.
 */
export const USER_STATUSES = [
  { value: "pupil", label: msg("Élève") },
  { value: "student", label: msg("Étudiant(e)") },
  { value: "employee", label: msg("Salarié(e)") },
  { value: "civil_servant", label: msg("Fonctionnaire") },
  { value: "entrepreneur", label: msg("Entrepreneur, chef d'entreprise") },
  { value: "trader", label: msg("Commerçant(e)") },
  { value: "freelancer", label: msg("Freelance, indépendant(e)") },
  { value: "trainer", label: msg("Formateur, coach, enseignant") },
  { value: "artisan", label: msg("Artisan") },
  { value: "job_seeker", label: msg("Sans emploi, en recherche") },
  { value: "retired", label: msg("Retraité(e)") },
  { value: "other", label: msg("Autre") },
] as const;

export type UserStatus = (typeof USER_STATUSES)[number]["value"];
export const USER_STATUS_VALUES: readonly string[] = USER_STATUSES.map((s) => s.value);

export function userStatusLabel(value: string | null | undefined): string | null {
  return USER_STATUSES.find((s) => s.value === value)?.label ?? null;
}
