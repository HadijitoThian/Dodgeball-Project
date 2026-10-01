-- Batch 13: Dev account override
-- Run this against your Supabase project.

alter table public.profiles
  add column if not exists is_dev boolean not null default false;

-- Grant dev privileges to the game owner (hjthian@gmail.com).
update public.profiles
set is_dev = true
where lower(email) = 'hjthian@gmail.com';
