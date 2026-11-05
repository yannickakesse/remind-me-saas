-- ============================================================================
-- 0026 — Essai gratuit de 7 jours (droits Pro, sans carte, sans prélèvement)
-- ============================================================================
-- Migration ADDITIVE : aucune table supprimée, aucune donnée effacée, aucun forfait modifié.
--
-- Principe :
--   - L'essai démarre à la PREMIÈRE VRAIE UTILISATION : première activité, tâche, revenu,
--     dépense, dépense programmée, budget, objectif d'épargne, contact ou organisation créé
--     après l'onboarding. Créer un compte sans l'utiliser ne consomme pas l'essai.
--   - Les dates viennent uniquement du serveur (now()) : changer l'horloge du téléphone ne sert à rien.
--   - Le forfait enregistré reste « free » : les droits Pro pendant l'essai sont calculés par
--     l'application (lib/subscriptions). À la fin, retour automatique en Free, sans traitement
--     planifié et sans perte de données.
--   - Un seul essai par compte (trial_used). Anti-abus facultatif : empreinte HMAC de l'email
--     (irréversible, aucun email en clair), conservée si le compte est supprimé, pour empêcher
--     de recréer un compte avec la même adresse pour relancer un essai.
--
-- Facultatif (recommandé) AVANT d'exécuter : secret de l'empreinte dans Vault
--   select vault.create_secret('<longue valeur aléatoire>', 'remindme_trial_pepper');
-- Sans ce secret, l'essai reste limité à un par compte, sans contrôle par adresse email.
-- ============================================================================

-- 1. Colonnes d'essai
alter table public.subscriptions add column if not exists trial_started_at timestamptz;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.subscriptions add column if not exists trial_used boolean not null default false;

-- 2. Empreintes d'adresses ayant déjà bénéficié d'un essai (aucune donnée personnelle en clair)
create table if not exists public.trial_fingerprints (
  email_hmac text primary key,
  created_at timestamptz not null default now()
);
alter table public.trial_fingerprints enable row level security;
-- Aucune policy : inaccessible aux utilisateurs.

-- 3. Démarrage de l'essai (appelé par les déclencheurs ci-dessous)
create or replace function public.remindme_start_trial_if_eligible(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_sub record;
  v_onboarded boolean;
  v_email text;
  v_pepper text;
  v_hmac text;
begin
  if p_user_id is null then
    return;
  end if;

  select plan, status, trial_used into v_sub
    from public.subscriptions where user_id = p_user_id for update;
  -- Uniquement les comptes gratuits qui n'ont jamais eu d'essai
  if not found or v_sub.trial_used or v_sub.plan <> 'free' then
    return;
  end if;

  select onboarding_completed into v_onboarded from public.profiles where id = p_user_id;
  if not coalesce(v_onboarded, false) then
    return;
  end if;

  -- Anti-abus par adresse email (si le secret est configuré)
  select decrypted_secret into v_pepper from vault.decrypted_secrets where name = 'remindme_trial_pepper' limit 1;
  if v_pepper is not null then
    select lower(trim(email)) into v_email from auth.users where id = p_user_id;
    if v_email is not null then
      v_hmac := encode(hmac(v_email, v_pepper, 'sha256'), 'hex');
      if exists (select 1 from public.trial_fingerprints where email_hmac = v_hmac) then
        -- Adresse déjà utilisée pour un essai : pas de nouvel essai
        update public.subscriptions set trial_used = true where user_id = p_user_id;
        return;
      end if;
      insert into public.trial_fingerprints (email_hmac) values (v_hmac) on conflict do nothing;
    end if;
  end if;

  update public.subscriptions
     set trial_started_at = now(),
         trial_ends_at = now() + interval '7 days',
         trial_used = true
   where user_id = p_user_id;
end;
$$;

revoke all on function public.remindme_start_trial_if_eligible(uuid) from public, anon, authenticated;

create or replace function public.remindme_trial_on_first_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ne jamais bloquer la création de la donnée si l'essai échoue
  begin
    perform public.remindme_start_trial_if_eligible(new.user_id);
  exception when others then
    raise warning 'Remind Me essai : % ', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.remindme_trial_on_first_use() from public, anon, authenticated;

-- 4. Déclencheurs « première vraie utilisation »
do $$
declare
  t text;
begin
  foreach t in array array['activities', 'tasks', 'income', 'expenses', 'scheduled_expenses', 'budgets', 'savings_goals', 'contacts', 'organizations']
  loop
    execute format('drop trigger if exists trg_remindme_trial_first_use on public.%I', t);
    execute format(
      'create trigger trg_remindme_trial_first_use after insert on public.%I for each row execute function public.remindme_trial_on_first_use()',
      t
    );
  end loop;
end;
$$;
