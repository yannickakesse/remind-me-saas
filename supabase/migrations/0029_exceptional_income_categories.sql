-- ============================================================================
-- 0029 — Revenus exceptionnels : 5 nouvelles catégories de revenu
-- ============================================================================
-- Seule modification : la liste des valeurs autorisées de income.income_type.
--   bonus             : prime, récompense, gratification
--   windfall          : gain imprévu (argent retrouvé, entrée inattendue)
--   gift              : cadeau reçu (somme offerte)
--   refund            : remboursement reçu (argent récupéré — distingué des gains dans les rapports)
--   exceptional_other : autre revenu exceptionnel
--
-- Aucune table, aucune colonne, aucune donnée, aucune règle d'accès (RLS) n'est modifiée.
-- Les revenus existants gardent leur type actuel. La migration peut être rejouée sans risque.
-- ============================================================================

do $$
declare
  c record;
begin
  -- Retire l'ancienne contrainte de liste (nom généré automatiquement en 0008)
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'income'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%income_type%'
  loop
    execute format('alter table public.income drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.income
  add constraint income_income_type_check
  check (income_type in (
    'salary', 'contract', 'freelance', 'sales', 'coaching', 'dividend', 'other',
    'bonus', 'windfall', 'gift', 'refund', 'exceptional_other'
  ));
