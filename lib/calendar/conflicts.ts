export interface ConflictCheckableEvent {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
}

/**
 * Retourne l'ensemble des id d'événements qui se chevauchent dans le temps
 * avec au moins un autre événement de la liste. Les événements annulés ne
 * comptent pas comme un conflit (un rendez-vous annulé libère le créneau).
 *
 * O(n log n) : tri par heure de début puis balayage, suffisant pour le
 * volume d'une vue calendrier (jour/semaine/mois/agenda).
 */
export function detectConflicts(events: ConflictCheckableEvent[]): Set<string> {
  const active = events
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({ ...e, startMs: Date.parse(e.starts_at), endMs: Date.parse(e.ends_at) }))
    .sort((a, b) => a.startMs - b.startMs);

  const conflicts = new Set<string>();

  for (let i = 0; i < active.length; i++) {
    const current = active[i];
    if (!current) continue; // inatteignable (i < active.length) — satisfait noUncheckedIndexedAccess
    for (let j = i + 1; j < active.length; j++) {
      const candidate = active[j];
      if (!candidate) continue;
      if (candidate.startMs >= current.endMs) break; // trié : plus de chevauchement possible ensuite
      conflicts.add(current.id);
      conflicts.add(candidate.id);
    }
  }

  return conflicts;
}
