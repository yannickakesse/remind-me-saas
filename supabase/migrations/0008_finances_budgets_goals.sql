-- ============================================================================
-- PHASES 7 & 8 — FINANCES ÉTENDUES, BUDGETS & OBJECTIFS D'ÉPARGNE
-- ============================================================================

-- 1. Extension de la table expenses (pro / perso / mixte + marchand + moyen de paiement)
alter table expenses
  add column if not exists expense_type text not null default 'personal'
    check (expense_type in ('personal', 'business', 'mixed')),
  add column if not exists business_percentage int not null default 100
    check (business_percentage >= 0 and business_percentage <= 100),
  add column if not exists merchant text,
  add column if not exists payment_method text;

-- 2. Extension de la table income (type de revenu + moyen de paiement + référence)
alter table income
  add column if not exists income_type text not null default 'contract'
    check (income_type in ('salary', 'contract', 'freelance', 'sales', 'coaching', 'dividend', 'other')),
  add column if not exists payment_method text,
  add column if not exists reference text;

-- 3. Table des Budgets mensuels par catégorie
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  category text not null,
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
  currency text not null references currencies (code) on delete restrict,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_user_budget_category unique (user_id, category, currency)
);

create index if not exists idx_budgets_user on budgets (user_id);

alter table budgets enable row level security;

create policy "select_own_budgets" on budgets for select using (auth.uid() = user_id);
create policy "insert_own_budgets" on budgets for insert with check (auth.uid() = user_id);
create policy "update_own_budgets" on budgets for update using (auth.uid() = user_id);
create policy "delete_own_budgets" on budgets for delete using (auth.uid() = user_id);

create trigger set_budgets_updated_at
  before update on budgets
  for each row execute procedure public.set_updated_at();

-- 4. Table des Objectifs d'Épargne & Poches
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null,
  category text not null default 'other' check (category in (
    'emergency_fund', 'vacation', 'car', 'business', 'real_estate', 'education', 'equipment', 'other'
  )),
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  currency text not null references currencies (code) on delete restrict,

  deadline date,
  monthly_contribution numeric(12, 2) check (monthly_contribution is null or monthly_contribution >= 0),
  color text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_savings_goals_user on savings_goals (user_id);

alter table savings_goals enable row level security;

create policy "select_own_savings_goals" on savings_goals for select using (auth.uid() = user_id);
create policy "insert_own_savings_goals" on savings_goals for insert with check (auth.uid() = user_id);
create policy "update_own_savings_goals" on savings_goals for update using (auth.uid() = user_id);
create policy "delete_own_savings_goals" on savings_goals for delete using (auth.uid() = user_id);

create trigger set_savings_goals_updated_at
  before update on savings_goals
  for each row execute procedure public.set_updated_at();
