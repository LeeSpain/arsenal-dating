-- Arsenal Dating — initial schema (MVP, BUILD_SPEC §5)
-- UUID primary keys + Row Level Security on every table.
--
-- PRIVACY MODEL (founder GDPR decision, "Q3"):
--   Base tables holding personal data (profiles, photos, questionnaire) are
--   OWNER-ONLY via RLS — a user can read/write only their own rows. Other users
--   are seen ONLY through the `public_profiles` view, which exposes safe fields
--   plus AGE AS A COMPUTED INTEGER and never the date of birth, email, or
--   auth id. The deck/matching reads the view; nothing reads another user's dob.
--
-- AGE (18+): enforced client-side (non-coachable UX) AND here as defense in
--   depth — a BEFORE INSERT/UPDATE trigger rejects any profile whose dob is
--   under 18. Under-18 sign-ups are fully erased by the app, not stored.
--
-- Feature logic deferred to its own build step (tables are shaped for it):
--   * match creation on mutual like  -> matching step (trigger / RPC)
--   * women-message-first enforcement -> messaging step (trigger / RPC)

-- ---------------------------------------------------------------------------
-- Helpers
-- (current_profile_id() is defined AFTER profiles exists — a `language sql`
--  function validates its body at creation time, so it can't reference a table
--  that doesn't exist yet.)
-- ---------------------------------------------------------------------------

-- Reject any profile row for someone under 18 (defense in depth; the app erases
-- under-18 sign-ups before they reach here).
create or replace function public.enforce_adult_dob()
returns trigger
language plpgsql
as $$
begin
  if new.dob is null or new.dob > (current_date - interval '18 years') then
    raise exception 'profile must be 18 or older';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles  (OWNER-ONLY — others see you via public_profiles)
-- display_name / gender are nullable: set during onboarding, after the age gate
-- creates the row with dob. onboarding_completed gates deck visibility.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key default gen_random_uuid(),
  auth_id             uuid not null unique references auth.users (id) on delete cascade,
  display_name        text,
  dob                 date not null,                 -- private; never exposed to others
  gender              text
                        check (gender in ('woman','man','non_binary','other','prefer_not_to_say')),
  bio                 text,
  looking_for         text,
  location            text,                          -- coarse, city-level
  kit_verified        boolean not null default false,
  kit_photo_url       text,
  onboarding_completed boolean not null default false,
  tos_accepted_at     timestamptz,                   -- consent record (GDPR)
  policy_version      text,                          -- which policy version was accepted
  created_at          timestamptz not null default now()
);

create trigger profiles_enforce_adult_dob
  before insert or update of dob on public.profiles
  for each row execute function public.enforce_adult_dob();

alter table public.profiles enable row level security;

create policy "users read their own profile"
  on public.profiles for select to authenticated
  using (auth_id = auth.uid());

create policy "users insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth_id = auth.uid());

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());

create policy "users delete their own profile"
  on public.profiles for delete to authenticated
  using (auth_id = auth.uid());

-- Map the current auth user to their profile id (profiles now exists).
-- SECURITY DEFINER so it bypasses RLS; used by the child-table policies below.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- photos  (OWNER-ONLY — surfaced to others through public_profiles.photo_urls)
-- ---------------------------------------------------------------------------
create table public.photos (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  url         text not null,
  sort_order  integer not null default 0,      -- BUILD_SPEC calls this "order"
  is_primary  boolean not null default false
);

create index photos_profile_id_idx on public.photos (profile_id);

alter table public.photos enable row level security;

create policy "users manage their own photos"
  on public.photos for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- questionnaire  (OWNER-ONLY — matching fields surfaced via public_profiles)
-- Answers BOOST match ordering, never filter (BUILD_SPEC §6).
-- ---------------------------------------------------------------------------
create table public.questionnaire (
  profile_id        uuid primary key references public.profiles (id) on delete cascade,
  favourite_players text[] not null default '{}',
  favourite_era     text,
  favourite_manager text,
  supporting_since  integer                     -- year, e.g. 2004
);

alter table public.questionnaire enable row level security;

create policy "users manage their own questionnaire"
  on public.questionnaire for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- preferences  (OWNER-ONLY, private)
-- ---------------------------------------------------------------------------
create table public.preferences (
  profile_id           uuid primary key references public.profiles (id) on delete cascade,
  min_age              integer not null default 18 check (min_age >= 18),
  max_age              integer not null default 99 check (max_age >= min_age),
  max_distance_km      integer not null default 100 check (max_distance_km > 0),
  interested_in_gender text[] not null default '{}'  -- multi-select
);

alter table public.preferences enable row level security;

create policy "users manage their own preferences"
  on public.preferences for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- public_profiles  (the ONLY way to see other users)
-- Exposes safe fields + computed AGE (integer), never dob/email/auth_id.
-- A plain (non-security_invoker) view owned by the migration role: it reads
-- across the owner-only base tables but only returns these safe columns.
-- Only completed profiles appear in the deck.
-- ---------------------------------------------------------------------------
create view public.public_profiles as
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
       from public.photos ph
      where ph.profile_id = p.id),
    '{}'
  ) as photo_urls,
  q.favourite_players,
  q.favourite_era,
  q.favourite_manager,
  q.supporting_since
from public.profiles p
left join public.questionnaire q on q.profile_id = p.id
where p.onboarding_completed = true;

grant select on public.public_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- swipes — one decision per (swiper, target)
-- ---------------------------------------------------------------------------
create table public.swipes (
  id         uuid primary key default gen_random_uuid(),
  swiper_id  uuid not null references public.profiles (id) on delete cascade,
  target_id  uuid not null references public.profiles (id) on delete cascade,
  direction  text not null check (direction in ('like','pass')),
  created_at timestamptz not null default now(),
  unique (swiper_id, target_id)
);

create index swipes_target_id_idx on public.swipes (target_id);

alter table public.swipes enable row level security;

create policy "users read their own swipes"
  on public.swipes for select to authenticated
  using (swiper_id = public.current_profile_id());

create policy "users insert their own swipes"
  on public.swipes for insert to authenticated
  with check (swiper_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- matches — created on mutual like (matching step's trigger/RPC).
-- profile_a < profile_b keeps each pair unique regardless of order.
-- ---------------------------------------------------------------------------
create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  profile_a  uuid not null references public.profiles (id) on delete cascade,
  profile_b  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (profile_a < profile_b),
  unique (profile_a, profile_b)
);

create index matches_profile_a_idx on public.matches (profile_a);
create index matches_profile_b_idx on public.matches (profile_b);

alter table public.matches enable row level security;

create policy "users read their own matches"
  on public.matches for select to authenticated
  using (
    profile_a = public.current_profile_id()
    or profile_b = public.current_profile_id()
  );

-- ---------------------------------------------------------------------------
-- messages — real-time chat within a match
-- ---------------------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index messages_match_id_created_at_idx on public.messages (match_id, created_at);

alter table public.messages enable row level security;

create policy "users read messages in their matches"
  on public.messages for select to authenticated
  using (
    match_id in (
      select id from public.matches
      where profile_a = public.current_profile_id()
         or profile_b = public.current_profile_id()
    )
  );

-- Membership + sender check; women-message-first is added as a trigger in the
-- messaging build step.
create policy "users send messages in their matches"
  on public.messages for insert to authenticated
  with check (
    sender_id = public.current_profile_id()
    and match_id in (
      select id from public.matches
      where profile_a = public.current_profile_id()
         or profile_b = public.current_profile_id()
    )
  );

-- ---------------------------------------------------------------------------
-- reports — reach a manual admin queue (MVP safety)
-- ---------------------------------------------------------------------------
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null,
  details     text,
  status      text not null default 'open'
                check (status in ('open','reviewing','resolved','dismissed')),
  created_at  timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);

alter table public.reports enable row level security;

create policy "users create their own reports"
  on public.reports for insert to authenticated
  with check (reporter_id = public.current_profile_id());

create policy "users read reports they filed"
  on public.reports for select to authenticated
  using (reporter_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------
create table public.blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index blocks_blocked_id_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "users manage their own blocks"
  on public.blocks for all to authenticated
  using (blocker_id = public.current_profile_id())
  with check (blocker_id = public.current_profile_id());
