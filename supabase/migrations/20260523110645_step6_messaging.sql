-- Step 6 — messaging: women-message-first, enforced at the DB layer.
--
-- The restriction applies ONLY to the FIRST message in a match:
--   * "restricted" pairing = exactly one participant is a woman AND the other is
--     man / other / prefer_not_to_say  -> only the woman may send the first message.
--   * any pairing involving non_binary, or a same-gender pairing -> either may open.
-- After the first message exists, both participants can send freely.
--
-- SECURITY DEFINER so the trigger can read BOTH participants' gender past the
-- owner-only RLS on profiles. Participant-only read/membership is already enforced
-- by the existing messages RLS policies; this only adds the first-sender rule.

create or replace function public.enforce_women_message_first()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pa uuid; pb uuid; ga text; gb text;
  woman_id uuid;
  restricted boolean := false;
begin
  -- Only the FIRST message is constrained.
  if exists (select 1 from public.messages where match_id = new.match_id) then
    return new;
  end if;

  select m.profile_a, m.profile_b into pa, pb
  from public.matches m where m.id = new.match_id;
  if pa is null then
    return new; -- not a real match; membership RLS will reject the insert anyway
  end if;

  select gender into ga from public.profiles where id = pa;
  select gender into gb from public.profiles where id = pb;

  if ga = 'woman' and gb in ('man', 'other', 'prefer_not_to_say') then
    restricted := true;
    woman_id := pa;
  elsif gb = 'woman' and ga in ('man', 'other', 'prefer_not_to_say') then
    restricted := true;
    woman_id := pb;
  end if;

  if restricted and new.sender_id <> woman_id then
    raise exception 'women_message_first: only she can send the first message in this match';
  end if;

  return new;
end;
$$;

create trigger messages_women_message_first
  before insert on public.messages
  for each row execute function public.enforce_women_message_first();

-- ---------------------------------------------------------------------------
-- Real-time: stream message inserts to participants. Supabase Realtime applies
-- the existing SELECT RLS, so a user only ever receives messages in their own
-- matches.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
