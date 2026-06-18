-- One-time ("pay per analysis") unlocks.
--
-- A row here means: this user has paid the one-time fee to view the full
-- breakdown of this specific analysis, forever. The gate is therefore
-- "isPremium(profile) OR a row exists for (user_id, analysis_id)".
--
-- Run this in the Supabase SQL editor (or via the CLI) before deploying the
-- one-time-payment feature.

-- NOTE: profiles.id is `text` in this database, so user_id must also be `text`
-- for the foreign key to match. analysis_results.id is `uuid`.
create table if not exists public.analysis_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  analysis_id uuid not null references public.analysis_results (id) on delete cascade,
  stripe_session_id text,
  amount integer,        -- amount paid, in the smallest currency unit (e.g. cents)
  currency text,
  created_at timestamptz not null default now(),
  -- A user only ever needs one unlock per analysis; makes fulfillment idempotent.
  unique (user_id, analysis_id)
);

create index if not exists analysis_unlocks_user_id_idx
  on public.analysis_unlocks (user_id);

-- RLS: a user may read their own unlocks. Inserts happen exclusively via the
-- service-role key (Stripe webhook + checkout reconcile), which bypasses RLS,
-- so no INSERT policy is granted to end users.
alter table public.analysis_unlocks enable row level security;

drop policy if exists "Users can view their own unlocks" on public.analysis_unlocks;
create policy "Users can view their own unlocks"
  on public.analysis_unlocks
  for select
  using (auth.uid()::text = user_id);
