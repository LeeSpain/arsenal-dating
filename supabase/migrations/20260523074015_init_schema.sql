-- Arsenal Dating — initial schema (MVP, BUILD_SPEC §5)
-- UUID primary keys + Row Level Security on every table.
--
-- NOTE (do not push blind): profile/photo/questionnaire rows are readable by any
-- authenticated user so the swipe deck can be built. That exposes personal data
-- (incl. dob, coarse location) app-wide. This intersects the open GDPR question
-- (BUILD_SPEC §11) and must be reviewed before launch — consider a public-safe
-- view or column-level restrictions then. Flagged, not decided here.
--
-- Feature logic intentionally deferred to its own build step:
--   * match creation on mutual like  -> matching step (trigger / RPC)
--   * women-message-first enforcement -> messaging step (trigger / RPC)
-- Tables are shaped to support both; the rules themselves are added later.

-- ---------------------------------------------------------------------------
-- Helper: map the current auth user to their profile id (bypasses RLS safely).
-- ---------------------------------------------------------------------------
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
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid not null unique references auth.users (id) on delete cascade,
  display_name  text not null,
  dob           date not null,                 -- set after the 18+ age gate
  gender        text not null
                  check (gender in ('woman','man','non_binary','other','prefer_not_to_say')),
  bio           text,
  looking_for   text,
  location      text,                          -- coarse, city-level only (GDPR)
  kit_verified  boolean not null default false,
  kit_photo_url text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "users insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth_id = auth.uid());

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());

create policy "users delete their own profile"
  on public.profiles for delete to authenticated
  using (auth_id = auth.uid());

-- ---------------------------------------------------------------------------
-- photos
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

create policy "photos are readable by authenticated users"
  on public.photos for select to authenticated using (true);

create policy "users manage their own photos"
  on public.photos for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- questionnaire (one row per profile)
-- ---------------------------------------------------------------------------
create table public.questionnaire (
  profile_id        uuid primary key references public.profiles (id) on delete cascade,
  favourite_players text[] not null default '{}',
  favourite_era     text,
  favourite_manager text,
  supporting_since  integer                     -- year, e.g. 2004
);

alter table public.questionnaire enable row level security;

-- Readable by authenticated users: answers BOOST match ordering (never filter),
-- so the ranking step needs to read others' answers.
create policy "questionnaire is readable by authenticated users"
  on public.questionnaire for select to authenticated using (true);

create policy "users manage their own questionnaire"
  on public.questionnaire for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- preferences (one row per profile) — private to the owner
-- ---------------------------------------------------------------------------
create table public.preferences (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  min_age             integer not null default 18 check (min_age >= 18),
  max_age             integer not null default 99 check (max_age >= min_age),
  max_distance_km     integer not null default 100 check (max_distance_km > 0),
  interested_in_gender text[] not null default '{}'  -- multi-select
);

alter table public.preferences enable row level security;

create policy "users manage their own preferences"
  on public.preferences for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

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
-- matches — created on mutual like (by the matching step's trigger/RPC).
-- profile_a < profile_b is enforced so each pair is unique regardless of order.
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

-- Readable only by the two people in the match. No user INSERT policy on purpose:
-- matches are created server-side (SECURITY DEFINER) in the matching step.
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

-- Membership + sender check here; the women-message-first rule is added as a
-- BEFORE INSERT trigger in the messaging build step.
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

-- A reporter can create a report and see the ones they filed. Reading the full
-- queue is an admin action handled with the service role (server side), not here.
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
