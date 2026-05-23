-- Hardening #3 — stop bulk profile enumeration + photo scraping.
--
-- Before: any authenticated user could `select * from public_profiles` (whole base)
-- and read/list the entire `photos` bucket. Now:
--   * public_profiles only returns YOU + people you've MATCHED with.
--   * get_deck is the ONLY browse path; it reads base tables directly (so it no
--     longer depends on public_profiles) and keeps the inclusive rule intact.
--   * the photos bucket is owner-only at the storage layer (no list / no signing
--     of others' files); other users' photos are signed by the sign-photos Edge
--     Function after a visibility check (photos_for_viewer).

-- ---------------------------------------------------------------------------
-- public_profiles: restrict to self + matches (kills view-based enumeration)
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
  and (
    p.id = public.current_profile_id()
    or exists (
      select 1 from public.matches m
      where (m.profile_a = public.current_profile_id() and m.profile_b = p.id)
         or (m.profile_b = public.current_profile_id() and m.profile_a = p.id)
    )
  )
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = public.current_profile_id() and b.blocked_id = p.id)
       or (b.blocker_id = p.id and b.blocked_id = public.current_profile_id())
  );

-- ---------------------------------------------------------------------------
-- get_deck: now reads base tables directly (no dependency on public_profiles).
-- Membership = gender preference + exclusions ONLY (inclusive rule); distance/age
-- are soft tiers; questionnaire is used ONLY in the boost. Returns safe columns.
-- ---------------------------------------------------------------------------
create or replace function public.get_deck(p_limit int default 40, p_offset int default 0)
returns table (
  id uuid, display_name text, age int, gender text, bio text, looking_for text,
  location text, kit_verified boolean, photo_urls text[],
  favourite_players text[], favourite_era text, favourite_manager text,
  supporting_since int, distance_km double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me_id uuid; me_lat double precision; me_lng double precision;
  me_min int; me_max int; me_dist int; me_genders text[];
  me_era text; me_mgr text; me_players text[]; me_since int;
begin
  select p.id, p.city_lat, p.city_lng into me_id, me_lat, me_lng
  from public.profiles p where p.auth_id = auth.uid();
  if me_id is null then return; end if;

  select pr.min_age, pr.max_age, pr.max_distance_km, pr.interested_in_gender
    into me_min, me_max, me_dist, me_genders
  from public.preferences pr where pr.profile_id = me_id;
  me_min := coalesce(me_min, 18); me_max := coalesce(me_max, 99);
  me_dist := coalesce(me_dist, 100); me_genders := coalesce(me_genders, '{}');

  select q.favourite_era, q.favourite_manager, q.favourite_players, q.supporting_since
    into me_era, me_mgr, me_players, me_since
  from public.questionnaire q where q.profile_id = me_id;
  me_players := coalesce(me_players, '{}');

  return query
  with cand as (
    select
      c.id,
      c.display_name,
      extract(year from age(c.dob))::int as age,
      c.gender, c.bio, c.looking_for, c.location, c.kit_verified,
      coalesce((select array_agg(ph.url order by ph.is_primary desc, ph.sort_order)
                  from public.photos ph where ph.profile_id = c.id), '{}') as photo_urls,
      cq.favourite_players, cq.favourite_era, cq.favourite_manager, cq.supporting_since,
      public.haversine_km(me_lat, me_lng, c.city_lat, c.city_lng) as dist
    from public.profiles c
    left join public.questionnaire cq on cq.profile_id = c.id
    where c.id <> me_id
      and c.onboarding_completed = true
      and c.is_suspended = false
      -- HARD membership filters (NO questionnaire here):
      and (cardinality(me_genders) = 0 or c.gender = any (me_genders))
      and not exists (select 1 from public.swipes s
                       where s.swiper_id = me_id and s.target_id = c.id)
      and not exists (select 1 from public.blocks b
                       where (b.blocker_id = me_id and b.blocked_id = c.id)
                          or (b.blocker_id = c.id and b.blocked_id = me_id))
  ),
  tiered as (
    select cand.*,
      case
        when (cand.dist is not null and cand.dist <= me_dist)
             and (cand.age between me_min and me_max) then 0
        when (cand.age between me_min and me_max) then 1
        else 2
      end as tier,
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

-- ---------------------------------------------------------------------------
-- Storage: photos read becomes OWNER-ONLY (no list / no signing of others)
-- ---------------------------------------------------------------------------
drop policy "photos read (authenticated)" on storage.objects;

create policy "photos read (owner)"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- photos_for_viewer: returns photo PATHS for the profiles a viewer may legitimately
-- see (self / matched / a valid deck candidate / someone the viewer has blocked,
-- for their own Blocked list). Used by the sign-photos Edge Function (service role)
-- which then mints signed URLs. Not granted to clients.
-- ---------------------------------------------------------------------------
create or replace function public.photos_for_viewer(p_viewer uuid, p_ids uuid[])
returns table (profile_id uuid, paths text[])
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
    coalesce((select array_agg(ph.url order by ph.is_primary desc, ph.sort_order)
                from public.photos ph where ph.profile_id = p.id), '{}')
  from public.profiles p
  left join public.preferences vp on vp.profile_id = p_viewer
  where p.id = any (p_ids)
    -- the target must not have blocked the viewer
    and not exists (select 1 from public.blocks b
                     where b.blocker_id = p.id and b.blocked_id = p_viewer)
    and (
      p.id = p_viewer
      or exists (select 1 from public.matches m
                  where (m.profile_a = p_viewer and m.profile_b = p.id)
                     or (m.profile_b = p_viewer and m.profile_a = p.id))
      or exists (select 1 from public.blocks b2
                  where b2.blocker_id = p_viewer and b2.blocked_id = p.id)
      or (
        p.onboarding_completed and not p.is_suspended
        and not exists (select 1 from public.blocks b3
                         where (b3.blocker_id = p_viewer and b3.blocked_id = p.id)
                            or (b3.blocker_id = p.id and b3.blocked_id = p_viewer))
        and (
          vp.interested_in_gender is null
          or cardinality(vp.interested_in_gender) = 0
          or p.gender = any (vp.interested_in_gender)
        )
      )
    );
$$;

grant execute on function public.photos_for_viewer(uuid, uuid[]) to service_role;
