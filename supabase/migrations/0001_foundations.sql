-- ============================================================================
-- PHASE 1 — FONDATIONS
-- Tables de référence, profils, paramètres, abonnements, RLS, trigger d'auto-
-- création du profil à l'inscription.
-- Les modules Activités / Calendrier / Finances arrivent dans les migrations
-- suivantes (0002_activities.sql, 0003_calendar.sql, ...), conformément à
-- l'ordre de développement par phases.
-- ============================================================================

-- Extensions utiles
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tables de référence (lecture publique, écriture réservée au service_role)
-- ----------------------------------------------------------------------------
create table if not exists countries (
  code text primary key,           -- ISO 3166-1 alpha-2
  name text not null,
  default_locale text not null default 'fr'
);

create table if not exists currencies (
  code text primary key,           -- ISO 4217
  name text not null,
  symbol text not null
);

alter table countries enable row level security;
alter table currencies enable row level security;

create policy "public_read_countries" on countries
  for select using (true);

create policy "public_read_currencies" on currencies
  for select using (true);

-- ----------------------------------------------------------------------------
-- Profils utilisateur (1-1 avec auth.users)
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  country_code text references countries (code),
  default_currency text references currencies (code),
  timezone text not null default 'UTC',
  locale text not null default 'fr',
  week_start smallint not null default 1 check (week_start between 0 and 6),
  time_format text not null default '24h' check (time_format in ('12h', '24h')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "select_own_profile" on profiles
  for select using (auth.uid() = id);

create policy "update_own_profile" on profiles
  for update using (auth.uid() = id);

-- Pas de policy insert : le profil est créé uniquement par le trigger
-- ci-dessous (auth déclenche la création, pas l'utilisateur directement).

-- ----------------------------------------------------------------------------
-- Paramètres utilisateur
-- ----------------------------------------------------------------------------
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notif_prefs jsonb not null default '{}'::jsonb,
  ui_prefs jsonb not null default '{}'::jsonb,
  unique (user_id)
);

alter table user_settings enable row level security;

create policy "select_own_settings" on user_settings
  for select using (auth.uid() = user_id);

create policy "insert_own_settings" on user_settings
  for insert with check (auth.uid() = user_id);

create policy "update_own_settings" on user_settings
  for update using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Abonnements (plan FREE par défaut à l'inscription)
-- ----------------------------------------------------------------------------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  status text not null default 'active',
  current_period_end timestamptz,
  unique (user_id)
);

alter table subscriptions enable row level security;

create policy "select_own_subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- Pas de policy update/insert côté client : les changements de plan
-- passeront par une Edge Function / le futur module facturation (Phase 8).

-- ----------------------------------------------------------------------------
-- Trigger : à l'inscription, créer automatiquement profil + settings + abo
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.user_settings (user_id) values (new.id);

  insert into public.subscriptions (user_id) values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Trigger générique updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on profiles
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Données de référence minimales pour démarrer (extensible en Phase 7)
-- ----------------------------------------------------------------------------
insert into currencies (code, name, symbol) values
  ('XOF', 'Franc CFA (BCEAO)', 'CFA'),
  ('EUR', 'Euro', '€'),
  ('USD', 'Dollar américain', '$'),
  ('GBP', 'Livre sterling', '£'),
  ('CAD', 'Dollar canadien', 'CA$'),
  ('CHF', 'Franc suisse', 'CHF')
on conflict (code) do nothing;

insert into countries (code, name, default_locale) values
  ('CI', 'Côte d''Ivoire', 'fr'),
  ('FR', 'France', 'fr'),
  ('SN', 'Sénégal', 'fr'),
  ('CA', 'Canada', 'fr'),
  ('US', 'États-Unis', 'en'),
  ('GB', 'Royaume-Uni', 'en')
on conflict (code) do nothing;
