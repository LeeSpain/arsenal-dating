-- Step 5 — swipe deck + matching.
--
-- Distance is COARSE: each profile stores its CITY'S centre coordinates (shared by
-- everyone in that city), never a precise/per-user location. Coordinates come from
-- a seeded `cities` reference table (city autocomplete at onboarding).
--
-- The deck (`get_deck`) keeps the inclusive guarantee structural: membership is
-- decided ONLY by gender preference + exclusions (self/swiped/blocked); distance
-- and age are SOFT (they tier the order and enable progressive relaxation); the
-- questionnaire appears ONLY in the boost used for ordering. So a fan with zero
-- questionnaire answers has the exact same eligible membership as a fully-answered
-- fan — only the order differs.

-- ---------------------------------------------------------------------------
-- City-centre coordinates on the profile (coarse; not per-user GPS)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column city_lat double precision,
  add column city_lng double precision;

-- ---------------------------------------------------------------------------
-- cities reference table (public, read-only to users). Starter set below; the
-- full GeoNames import is a drop-in later (same columns).
-- ---------------------------------------------------------------------------
create table public.cities (
  id      serial primary key,
  name    text not null,
  country text not null,
  lat     double precision not null,
  lng     double precision not null
);
create index cities_name_idx on public.cities (lower(name));

alter table public.cities enable row level security;
create policy "cities readable by authenticated"
  on public.cities for select to authenticated using (true);

insert into public.cities (name, country, lat, lng) values
  ('London', 'United Kingdom', 51.5074, -0.1278),
  ('Manchester', 'United Kingdom', 53.4808, -2.2426),
  ('Birmingham', 'United Kingdom', 52.4862, -1.8904),
  ('Leeds', 'United Kingdom', 53.8008, -1.5491),
  ('Liverpool', 'United Kingdom', 53.4084, -2.9916),
  ('Sheffield', 'United Kingdom', 53.3811, -1.4701),
  ('Bristol', 'United Kingdom', 51.4545, -2.5879),
  ('Newcastle', 'United Kingdom', 54.9783, -1.6178),
  ('Nottingham', 'United Kingdom', 52.9548, -1.1581),
  ('Leicester', 'United Kingdom', 52.6369, -1.1398),
  ('Southampton', 'United Kingdom', 50.9097, -1.4044),
  ('Portsmouth', 'United Kingdom', 50.8198, -1.0880),
  ('Brighton', 'United Kingdom', 50.8225, -0.1372),
  ('Reading', 'United Kingdom', 51.4543, -0.9781),
  ('Luton', 'United Kingdom', 51.8787, -0.4200),
  ('Watford', 'United Kingdom', 51.6565, -0.3903),
  ('Cambridge', 'United Kingdom', 52.2053, 0.1218),
  ('Oxford', 'United Kingdom', 51.7520, -1.2577),
  ('Milton Keynes', 'United Kingdom', 52.0406, -0.7594),
  ('Norwich', 'United Kingdom', 52.6309, 1.2974),
  ('Coventry', 'United Kingdom', 52.4068, -1.5197),
  ('Hull', 'United Kingdom', 53.7457, -0.3367),
  ('Plymouth', 'United Kingdom', 50.3755, -4.1427),
  ('Cardiff', 'United Kingdom', 51.4816, -3.1791),
  ('Swansea', 'United Kingdom', 51.6214, -3.9436),
  ('Glasgow', 'United Kingdom', 55.8642, -4.2518),
  ('Edinburgh', 'United Kingdom', 55.9533, -3.1883),
  ('Aberdeen', 'United Kingdom', 57.1497, -2.0943),
  ('Belfast', 'United Kingdom', 54.5973, -5.9301),
  ('Dublin', 'Ireland', 53.3498, -6.2603),
  ('Cork', 'Ireland', 51.8985, -8.4756),
  ('Paris', 'France', 48.8566, 2.3522),
  ('Lyon', 'France', 45.7640, 4.8357),
  ('Marseille', 'France', 43.2965, 5.3698),
  ('Berlin', 'Germany', 52.5200, 13.4050),
  ('Munich', 'Germany', 48.1351, 11.5820),
  ('Hamburg', 'Germany', 53.5511, 9.9937),
  ('Madrid', 'Spain', 40.4168, -3.7038),
  ('Barcelona', 'Spain', 41.3851, 2.1734),
  ('Lisbon', 'Portugal', 38.7223, -9.1393),
  ('Amsterdam', 'Netherlands', 52.3676, 4.9041),
  ('Brussels', 'Belgium', 50.8503, 4.3517),
  ('Rome', 'Italy', 41.9028, 12.4964),
  ('Milan', 'Italy', 45.4642, 9.1900),
  ('Copenhagen', 'Denmark', 55.6761, 12.5683),
  ('Stockholm', 'Sweden', 59.3293, 18.0686),
  ('Oslo', 'Norway', 59.9139, 10.7522),
  ('New York', 'United States', 40.7128, -74.0060),
  ('Los Angeles', 'United States', 34.0522, -118.2437),
  ('Chicago', 'United States', 41.8781, -87.6298),
  ('Toronto', 'Canada', 43.6532, -79.3832),
  ('Sydney', 'Australia', -33.8688, 151.2093),
  ('Melbourne', 'Australia', -37.8136, 144.9631),
  ('Lagos', 'Nigeria', 6.5244, 3.3792),
  ('Accra', 'Ghana', 5.6037, -0.1870),
  ('Nairobi', 'Kenya', -1.2864, 36.8172),
  ('Dubai', 'United Arab Emirates', 25.2048, 55.2708),
  ('Singapore', 'Singapore', 1.3521, 103.8198),
  ('Tokyo', 'Japan', 35.6762, 139.6503);

-- ---------------------------------------------------------------------------
-- Haversine distance in km (null if either point is unknown)
-- ---------------------------------------------------------------------------
create or replace function public.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else 6371 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    ))
  end
$$;

-- ---------------------------------------------------------------------------
-- get_deck — the deck for the calling user.
-- SECURITY DEFINER so it can read candidate city coordinates for distance math,
-- but it RETURNS only public-safe columns + distance (never dob/email).
-- ---------------------------------------------------------------------------
create or replace function public.get_deck(p_limit int default 40, p_offset int default 0)
returns table (
  id uuid,
  display_name text,
  age int,
  gender text,
  bio text,
  looking_for text,
  location text,
  kit_verified boolean,
  photo_urls text[],
  favourite_players text[],
  favourite_era text,
  favourite_manager text,
  supporting_since int,
  distance_km double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me_id uuid;
  me_lat double precision;
  me_lng double precision;
  me_min int; me_max int; me_dist int; me_genders text[];
  me_era text; me_mgr text; me_players text[]; me_since int;
begin
  select p.id, p.city_lat, p.city_lng into me_id, me_lat, me_lng
  from public.profiles p where p.auth_id = auth.uid();
  if me_id is null then return; end if;

  select pr.min_age, pr.max_age, pr.max_distance_km, pr.interested_in_gender
    into me_min, me_max, me_dist, me_genders
  from public.preferences pr where pr.profile_id = me_id;
  me_min := coalesce(me_min, 18);
  me_max := coalesce(me_max, 99);
  me_dist := coalesce(me_dist, 100);
  me_genders := coalesce(me_genders, '{}');

  select q.favourite_era, q.favourite_manager, q.favourite_players, q.supporting_since
    into me_era, me_mgr, me_players, me_since
  from public.questionnaire q where q.profile_id = me_id;
  me_players := coalesce(me_players, '{}');

  return query
  with cand as (
    select pp.*, public.haversine_km(me_lat, me_lng, c.city_lat, c.city_lng) as dist
    from public.public_profiles pp
    join public.profiles c on c.id = pp.id          -- candidate coords (definer reads all)
    where pp.id <> me_id
      -- HARD membership filters (NO questionnaire here):
      and (cardinality(me_genders) = 0 or pp.gender = any (me_genders))
      and not exists (select 1 from public.swipes s
                       where s.swiper_id = me_id and s.target_id = pp.id)
      and not exists (select 1 from public.blocks b
                       where (b.blocker_id = me_id and b.blocked_id = pp.id)
                          or (b.blocker_id = pp.id and b.blocked_id = me_id))
  ),
  tiered as (
    select cand.*,
      -- SOFT tiers (distance then age) -> progressive relaxation:
      case
        when (cand.dist is not null and cand.dist <= me_dist)
             and (cand.age between me_min and me_max) then 0
        when (cand.age between me_min and me_max) then 1
        else 2
      end as tier,
      -- BOOST = the ONLY place the questionnaire is used (ordering only):
      ( case when me_era is not null and me_era = cand.favourite_era then 3 else 0 end
      + case when me_mgr is not null and me_mgr = cand.favourite_manager then 3 else 0 end
      + 2 * (select count(*) from unnest(me_players) p where p = any (cand.favourite_players))
      + case when me_since is not null and cand.supporting_since is not null
             then 5.0 / (1 + abs(me_since - cand.supporting_since)) else 0 end
      ) as boost
    from cand
  )
  select t.id, t.display_name, t.age, t.gender, t.bio, t.looking_for, t.location,
         t.kit_verified, t.photo_urls, t.favourite_players, t.favourite_era,
         t.favourite_manager, t.supporting_since, t.dist
  from tiered t
  order by t.tier asc, t.boost desc, t.dist asc nulls last,
           md5(t.id::text || me_id::text)
  limit p_limit offset p_offset;
end;
$$;

grant execute on function public.get_deck(int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Match creation on mutual like (AFTER INSERT on swipes)
-- ---------------------------------------------------------------------------
create or replace function public.create_match_on_mutual_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.direction = 'like' and exists (
    select 1 from public.swipes s
    where s.swiper_id = new.target_id
      and s.target_id = new.swiper_id
      and s.direction = 'like'
  ) then
    insert into public.matches (profile_a, profile_b)
    values (least(new.swiper_id, new.target_id), greatest(new.swiper_id, new.target_id))
    on conflict (profile_a, profile_b) do nothing;
  end if;
  return new;
end;
$$;

create trigger swipes_create_match
  after insert on public.swipes
  for each row execute function public.create_match_on_mutual_like();
