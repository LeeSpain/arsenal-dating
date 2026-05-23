-- Run this in the SEPARATE landing Supabase project (NOT the Arsenal Dating app's
-- project). Supabase Dashboard → SQL Editor → paste → Run.

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Anonymous INSERT only (the landing uses the anon key). There is deliberately no
-- SELECT/UPDATE/DELETE policy, so the list cannot be read through the API — export
-- it from the dashboard (Table editor → waitlist → Export to CSV) when you launch.
create policy "anyone can join the waitlist"
  on public.waitlist for insert to anon, authenticated
  with check (true);
