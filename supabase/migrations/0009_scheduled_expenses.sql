-- ============================================================================
-- PHASE 9 / EXTENSION : DÉPENSES PROGRAMMÉES & RÉCURRENCE
-- ============================================================================

create table if not exists scheduled_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id uuid references activities (id) on delete set null,

  name text not null,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null references currencies (code) on delete restrict,

  frequency text not null default 'monthly' check (
    frequency in ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')
  ),

  start_date date not null,
  end_date date,
  next_due_date date not null,

  status text not null default 'planned' check (
    status in ('planned', 'due', 'paid', 'cancelled')
  ),

  merchant text,
  payment_method text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scheduled_expenses_user on scheduled_expenses (user_id);
create index if not exists idx_scheduled_expenses_due on scheduled_expenses (user_id, next_due_date);
create index if not exists idx_scheduled_expenses_status on scheduled_expenses (user_id, status);

alter table scheduled_expenses enable row level security;

create policy "select_own_scheduled_expenses" on scheduled_expenses for select using (auth.uid() = user_id);
create policy "insert_own_scheduled_expenses" on scheduled_expenses for insert with check (auth.uid() = user_id);
create policy "update_own_scheduled_expenses" on scheduled_expenses for update using (auth.uid() = user_id);
create policy "delete_own_scheduled_expenses" on scheduled_expenses for delete using (auth.uid() = user_id);

create trigger set_scheduled_expenses_updated_at
  before update on scheduled_expenses
  for each row execute procedure public.set_updated_at();
