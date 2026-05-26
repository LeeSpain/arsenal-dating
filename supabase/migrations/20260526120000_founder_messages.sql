-- Founder messages inbox.
-- Public landing-page visitors send a short message; the founder (is_admin)
-- reads + marks-read inside the app. Nobody else can ever read these.

create table public.founder_messages (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  sender_name  text,
  sender_email text,
  message      text not null,
  is_read      boolean not null default false,
  read_at      timestamptz,
  constraint founder_messages_message_len check (char_length(message) between 1 and 2000),
  constraint founder_messages_name_len    check (sender_name  is null or char_length(sender_name)  <= 100),
  constraint founder_messages_email_len   check (sender_email is null or char_length(sender_email) <= 200)
);

create index founder_messages_created_idx on public.founder_messages (created_at desc);
create index founder_messages_unread_idx on public.founder_messages (created_at desc) where is_read = false;

alter table public.founder_messages enable row level security;

-- Anyone can send (anon + signed-in). What they can *write* is bounded by the
-- column-level grant further down — they can never set is_read, read_at, id
-- or created_at, so the row always arrives in its safe default state.
create policy "anyone can send a founder message"
  on public.founder_messages
  for insert
  to anon, authenticated
  with check (true);

-- Admin (the founder) reads and updates. Same is_admin check the other admin
-- tools use (kit-review, reports) — enforced at the DB, not just the UI.
create policy "admin reads founder messages"
  on public.founder_messages
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p
             where p.auth_id = auth.uid() and p.is_admin = true)
  );

create policy "admin updates founder messages"
  on public.founder_messages
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

-- Global hourly cap to prevent catastrophic spam flooding. Legitimate use will
-- never come close. Per-IP limits are enforced by the Supabase API gateway.
create or replace function public.rate_limit_founder_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.founder_messages
        where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limit: too many messages this hour, please try again later'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger founder_messages_rate_limit
  before insert on public.founder_messages
  for each row execute function public.rate_limit_founder_messages();

-- Column-level grant: senders can ONLY set the three sender-supplied fields.
-- Defaults take care of id / created_at / is_read / read_at, so a malicious
-- sender can't pre-mark their own message as read or backdate it.
grant insert (sender_name, sender_email, message) on public.founder_messages to anon, authenticated;

-- Admin reads + updates the table (RLS policies above narrow this to admins).
grant select, update on public.founder_messages to authenticated;
