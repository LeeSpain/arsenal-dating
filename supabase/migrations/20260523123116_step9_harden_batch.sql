-- Hardening batch — #5 suspend (both ways), #6 profile-completeness, #9 ghost-match,
-- #7 upload limits, + GDPR data export (right of access).

-- ---------------------------------------------------------------------------
-- #5 — Suspension takes effect immediately, BOTH directions:
--   * a suspended user cannot send messages or swipe;
--   * nobody can message INTO a thread whose other participant is suspended.
-- (Auth ban blocks login/refresh; these triggers block actions on a live token.)
-- ---------------------------------------------------------------------------
create or replace function public.reject_message_if_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_id uuid;
begin
  if exists (select 1 from public.profiles where id = new.sender_id and is_suspended) then
    raise exception 'suspended: your account is under review';
  end if;
  select case when m.profile_a = new.sender_id then m.profile_b else m.profile_a end
    into other_id
  from public.matches m where m.id = new.match_id;
  if other_id is not null
     and exists (select 1 from public.profiles where id = other_id and is_suspended) then
    raise exception 'suspended: this conversation is unavailable';
  end if;
  return new;
end;
$$;

create trigger messages_reject_suspended
  before insert on public.messages
  for each row execute function public.reject_message_if_suspended();

create or replace function public.reject_swipe_if_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where id = new.swiper_id and is_suspended) then
    raise exception 'suspended: your account is under review';
  end if;
  return new;
end;
$$;

create trigger swipes_reject_suspended
  before insert on public.swipes
  for each row execute function public.reject_swipe_if_suspended();

-- ---------------------------------------------------------------------------
-- #6 — Server-side profile completeness: onboarding_completed can only be true
-- when display_name + gender are set and at least one photo exists. Stops a
-- direct API call forcing an empty profile into the deck.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_profile_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.onboarding_completed then
    if new.display_name is null or new.gender is null then
      raise exception 'profile incomplete: a display name and gender are required';
    end if;
    if not exists (select 1 from public.photos where profile_id = new.id) then
      raise exception 'profile incomplete: at least one photo is required';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_complete
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_complete();

-- ---------------------------------------------------------------------------
-- #9 — No ghost matches: don't create a match if the pair is blocked either way.
-- ---------------------------------------------------------------------------
create or replace function public.create_match_on_mutual_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.direction = 'like'
     and exists (
       select 1 from public.swipes s
       where s.swiper_id = new.target_id
         and s.target_id = new.swiper_id
         and s.direction = 'like'
     )
     and not exists (
       select 1 from public.blocks b
       where (b.blocker_id = new.swiper_id and b.blocked_id = new.target_id)
          or (b.blocker_id = new.target_id and b.blocked_id = new.swiper_id)
     )
  then
    insert into public.matches (profile_a, profile_b)
    values (least(new.swiper_id, new.target_id), greatest(new.swiper_id, new.target_id))
    on conflict (profile_a, profile_b) do nothing;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- #7 — Upload limits at the storage API layer: 5 MB, images only.
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('photos', 'kit-photos');

-- ---------------------------------------------------------------------------
-- GDPR right of access — a user can export a copy of their own data. SECURITY
-- INVOKER so RLS guarantees it only ever returns the caller's own data (+ the
-- messages in their matches). Companion to the erasure (delete-account).
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.auth_id = auth.uid()),
    'questionnaire', (select to_jsonb(q) from public.questionnaire q where q.profile_id = public.current_profile_id()),
    'preferences', (select to_jsonb(pr) from public.preferences pr where pr.profile_id = public.current_profile_id()),
    'photos', (select coalesce(jsonb_agg(to_jsonb(ph)), '[]'::jsonb) from public.photos ph where ph.profile_id = public.current_profile_id()),
    'matches', (select coalesce(jsonb_agg(to_jsonb(mt)), '[]'::jsonb) from public.matches mt
                 where mt.profile_a = public.current_profile_id() or mt.profile_b = public.current_profile_id()),
    'messages', (select coalesce(jsonb_agg(to_jsonb(ms) order by ms.created_at), '[]'::jsonb) from public.messages ms
                  where ms.match_id in (select id from public.matches
                                         where profile_a = public.current_profile_id()
                                            or profile_b = public.current_profile_id())),
    'swipes', (select coalesce(jsonb_agg(to_jsonb(sw)), '[]'::jsonb) from public.swipes sw where sw.swiper_id = public.current_profile_id()),
    'blocks', (select coalesce(jsonb_agg(to_jsonb(bl)), '[]'::jsonb) from public.blocks bl where bl.blocker_id = public.current_profile_id()),
    'reports_filed', (select coalesce(jsonb_agg(to_jsonb(rp)), '[]'::jsonb) from public.reports rp where rp.reporter_id = public.current_profile_id())
  );
$$;

grant execute on function public.export_my_data() to authenticated;
