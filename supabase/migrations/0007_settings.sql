-- ============================================================================
-- FONDATIONS TRANSVERSES — PHASE 4 (Compte / Profil / Paramètres)
-- Avatar (Supabase Storage), suppression de compte en libre-service,
-- extension légère du profil.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Avatar
-- ----------------------------------------------------------------------------
alter table profiles add column if not exists avatar_url text;

-- Bucket public (les avatars ne sont pas des données sensibles ; lecture
-- publique par URL directe, écriture réservée au propriétaire du dossier).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Convention de chemin : {user_id}/{fichier} — permet une policy simple qui
-- vérifie que le premier segment du chemin correspond à auth.uid().
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Suppression de compte en libre-service (§97 du prompt maître)
-- Fonction "security definer" : le client (clé anon) ne détient jamais les
-- droits pour supprimer un utilisateur — seule cette fonction, exécutée
-- avec les privilèges du propriétaire (postgres), peut le faire, et
-- uniquement pour l'utilisateur courant (auth.uid()). Le cascade déjà en
-- place sur toutes les tables (profiles, activities, tasks, income,
-- expenses, notifications, ...) nettoie le reste automatiquement.
-- ----------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
