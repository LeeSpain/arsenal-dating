-- Step 7 — safety: block (total + bidirectional), report queue, suspend.
--
-- BLOCK is enforced across four DB layers so there is no UI-only hiding:
--   (a) blocks AFTER INSERT trigger deletes the match -> messages cascade away
--       (the thread disappears for BOTH).
--   (b) public_profiles excludes anyone blocked-either-way for the current user
--       (deck, matches header, any direct lookup go dark at once).
--   (c) get_deck already excludes blocks both directions (kept).
--   (d) messages BEFORE INSERT rejects a send between blocked participants.
--
-- SUSPEND: a service-role-only is_suspended flag (guarded like is_admin), paired
-- with a Supabase auth ban in the report-review function. Suspended users are
-- excluded from public_profiles and gated at app entry.

-- ---------------------------------------------------------------------------
-- is_suspended + extend the privileged-field guard
-- ---------------------------------------------------------------------------
alter table public.profiles add column is_suspended boolean not null default false;

create or replace function public.guard_privileged_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.kit_verified := false;
      new.is_suspended := false;
    else
      new.is_admin := old.is_admin;
      new.kit_verified := old.kit_verified;
      new.is_suspended := old.is_suspended;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- (a) Deleting the match (and its messages) when a block is created
-- ---------------------------------------------------------------------------
create or replace function public.delete_match_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.matches
  where profile_a = least(new.blocker_id, new.blocked_id)
    and profile_b = greatest(new.blocker_id, new.blocked_id);
  return new;
end;
$$;

create trigger blocks_delete_match
  after insert on public.blocks
  for each row execute function public.delete_match_on_block();

-- ---------------------------------------------------------------------------
-- (d) Reject a message between blocked participants (defense in depth)
-- ---------------------------------------------------------------------------
create or replace function public.reject_message_if_blocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_id uuid;
begin
  select case when m.profile_a = new.sender_id then m.profile_b else m.profile_a end
    into other_id
  from public.matches m where m.id = new.match_id;

  if other_id is not null and exists (
    select 1 from public.blocks b
    where (b.blocker_id = new.sender_id and b.blocked_id = other_id)
       or (b.blocker_id = other_id and b.blocked_id = new.sender_id)
  ) then
    raise exception 'blocked: messaging is not allowed between these users';
  end if;
  return new;
end;
$$;

create trigger messages_block_check
  before insert on public.messages
  for each row execute function public.reject_message_if_blocked();

-- ---------------------------------------------------------------------------
-- (b) public_profiles: exclude suspended + blocked-either-way for the caller
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles as
select
  p.id,
  p.display_name,
  extract(year from age(p.dob))::int as age,
  p.gender,
  p.bio,
  p.looking_for,
  p.location,
  p.kit_verified,
  coalesce(
    (select array_agg(ph.url order by ph.is_primary desc, ph.sort_order)
       from public.photos ph where ph.profile_id = p.id),
    '{}'
  ) as photo_urls,
  q.favourite_players,
  q.favourite_era,
  q.favourite_manager,
  q.supporting_since
from public.profiles p
left join public.questionnaire q on q.profile_id = p.id
where p.onboarding_completed = true
  and p.is_suspended = false
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = public.current_profile_id() and b.blocked_id = p.id)
       or (b.blocker_id = p.id and b.blocked_id = public.current_profile_id())
  );

-- ---------------------------------------------------------------------------
-- Blocked-list management: let a blocker see who they've blocked (scoped to
-- their OWN blocks) so they can unblock — bypasses the view filter on purpose.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_blocked_profiles()
returns table (block_id uuid, profile_id uuid, display_name text, photo_url text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, p.id, p.display_name,
    (select ph.url from public.photos ph
      where ph.profile_id = p.id order by ph.is_primary desc, ph.sort_order limit 1)
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = public.current_profile_id();
$$;

grant execute on function public.get_my_blocked_profiles() to authenticated;
