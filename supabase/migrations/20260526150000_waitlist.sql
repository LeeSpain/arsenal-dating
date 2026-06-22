-- Waitlist table for the landing site.
--
-- Originally intended for a separate Supabase project (see landing/waitlist.sql)
-- but consolidated onto MAIN so the landing only needs one set of credentials.
-- Anonymous INSERT only; no SELECT/UPDATE/DELETE policies, so the list can't be
-- read through the API — export it from the dashboard's Table Editor at launch.

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create policy "anyone can join the waitlist"
  on public.waitlist for insert to anon, authenticated
  with check (true);
