-- ============================================================================
-- Centeryou — schéma Supabase : comptes + sauvegarde en ligne
-- À exécuter UNE fois dans l'éditeur SQL de ton projet Supabase :
--   Supabase → ton projet → « SQL Editor » (icône >_) → « New query » → coller
--   ce script → « Run ». Le script est idempotent (réexécutable sans erreur).
-- ============================================================================

-- 1. Profils utilisateurs : un profil par compte (prénom + e-mail)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  prenom text not null default '',
  updated_at timestamptz not null default now()
);

-- 2. Sauvegarde des données : UNE sauvegarde JSON par compte
--    (événements + tâches + réglages). La version la plus récente gagne
--    (champ savedAt du payload, géré par l'application).
create table if not exists public.backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- 3. Sécurité (RLS) : chaque utilisateur ne voit et n'écrit QUE ses lignes
alter table public.profiles enable row level security;
alter table public.backups enable row level security;

drop policy if exists "profiles: lecture de son profil" on public.profiles;
create policy "profiles: lecture de son profil"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: création de son profil" on public.profiles;
create policy "profiles: création de son profil"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles: modification de son profil" on public.profiles;
create policy "profiles: modification de son profil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "backups: lecture de sa sauvegarde" on public.backups;
create policy "backups: lecture de sa sauvegarde"
  on public.backups for select
  using (auth.uid() = user_id);

drop policy if exists "backups: écriture de sa sauvegarde" on public.backups;
create policy "backups: écriture de sa sauvegarde"
  on public.backups for insert
  with check (auth.uid() = user_id);

drop policy if exists "backups: mise à jour de sa sauvegarde" on public.backups;
create policy "backups: mise à jour de sa sauvegarde"
  on public.backups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "backups: suppression de sa sauvegarde" on public.backups;
create policy "backups: suppression de sa sauvegarde"
  on public.backups for delete
  using (auth.uid() = user_id);

-- 4. Le profil est créé automatiquement à chaque inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, prenom)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'prenom', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
