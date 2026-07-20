-- Admin CRUD: captures DB changes already applied live via the SQL Editor so
-- the repo and database no longer drift. Fully IDEMPOTENT — safe to re-run on a
-- DB that already has all of this: "if not exists" for columns/table, and every
-- policy is dropped-if-exists immediately before being (re)created.
--
-- Mirrors what backs the admin Control Centre's full CRUD + in-app replies:
--   waitlist              — admin DELETE + UPDATE
--   founder_messages      — archived + replied_at columns, admin DELETE
--   founder_message_replies — reply log, admin SELECT (inserts are done by the
--                             admin-message-reply Edge Function via service role)

-- ---------------------------------------------------------------------------
-- waitlist: admin DELETE + UPDATE
-- ---------------------------------------------------------------------------
drop policy if exists "admin deletes waitlist" on public.waitlist;
create policy "admin deletes waitlist"
  on public.waitlist
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p
             where p.auth_id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "admin updates waitlist" on public.waitlist;
create policy "admin updates waitlist"
  on public.waitlist
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles p
             where p.auth_id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p
             where p.auth_id = auth.uid() and p.is_admin = true)
  );

grant delete, update on public.waitlist to authenticated;

-- ---------------------------------------------------------------------------
-- founder_messages: archived + replied_at columns, admin DELETE
-- ---------------------------------------------------------------------------
alter table public.founder_messages
  add column if not exists archived boolean not null default false;
alter table public.founder_messages
  add column if not exists replied_at timestamptz;

drop policy if exists "admin deletes founder messages" on public.founder_messages;
create policy "admin deletes founder messages"
  on public.founder_messages
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p
             where p.auth_id = auth.uid() and p.is_admin = true)
  );

grant delete on public.founder_messages to authenticated;

-- ---------------------------------------------------------------------------
-- founder_message_replies: reply log + admin SELECT
-- Inserts + message updates are performed by the admin-message-reply Edge
-- Function using the service-role key, which bypasses RLS — so only a SELECT
-- policy is needed here for the admin UI to read replies back.
-- ---------------------------------------------------------------------------
create table if not exists public.founder_message_replies (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.founder_messages (id) on delete cascade,
  body       text not null,
  sent_at    timestamptz not null default now(),
  sent_by    uuid references public.profiles (id) on delete set null
);

create index if not exists founder_message_replies_message_idx
  on public.founder_message_replies (message_id, sent_at);

alter table public.founder_message_replies enable row level security;

drop policy if exists "admin reads founder message replies" on public.founder_message_replies;
create policy "admin reads founder message replies"
  on public.founder_message_replies
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p
             where p.auth_id = auth.uid() and p.is_admin = true)
  );

grant select on public.founder_message_replies to authenticated;
