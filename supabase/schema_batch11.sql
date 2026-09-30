-- Batch 11: Cosmetics shop
-- Run this against your Supabase project.

create table if not exists public.owned_skins (
  user_id       uuid  not null references auth.users(id) on delete cascade,
  character_id  text  not null,
  skin_id       text  not null,
  price_paid    int   not null default 0,
  purchased_at  timestamptz not null default now(),
  primary key (user_id, character_id, skin_id)
);

create index if not exists owned_skins_user_idx on public.owned_skins (user_id);

alter table public.owned_skins enable row level security;

drop policy if exists "owned_skins read own" on public.owned_skins;
create policy "owned_skins read own"
  on public.owned_skins for select
  using (auth.uid() = user_id);

drop policy if exists "owned_skins insert own" on public.owned_skins;
create policy "owned_skins insert own"
  on public.owned_skins for insert
  with check (auth.uid() = user_id);

grant select, insert on public.owned_skins to authenticated;
grant select, insert, update, delete on public.owned_skins to service_role;
