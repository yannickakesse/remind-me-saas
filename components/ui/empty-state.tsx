interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * État vide générique (§62 du prompt maître) — chaque section doit
 * expliquer quoi faire ensuite, pas seulement constater l'absence de
 * données. Remplace les blocs "bordure en pointillés" dupliqués dans
 * chaque page (dashboard, activités, tâches, notifications...).
 */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-ink-300 px-6 py-12 text-center">
      {icon ? <div className="mb-3 flex justify-center text-ink-500">{icon}</div> : null}
      <p className="mb-1 font-medium text-ink-950">{title}</p>
      {description ? <p className="mb-4 text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}
