-- Batch 10: Spectator support
-- Run this against your Supabase project.

-- Show what room a player is currently in (if any). Null when not in a match.
alter table public.profiles
  add column if not exists current_room_code text,
  add column if not exists current_room_since timestamptz;

-- Everyone can read (they already could via the "profiles readable" policy).
-- Only the owner can update — the existing "update own profile" policy
-- covers this.
