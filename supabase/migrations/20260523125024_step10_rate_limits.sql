-- Hardening #8 — server-side per-user rate limits (complementary to #3).
--
-- Limits (tunable in one place here):
--   get_deck      60 / minute   (deck browse — bounds the paging residual)
--   sign-photos   60 / minute   (photo signing — enforced in the Edge Function)
--   messages      30 / minute
--   reports       10 / hour
-- Sign-up bot protection is handled at the Auth layer (per-IP rate limits in the
-- dashboard; CAPTCHA deferred — see BUILD_SPEC §12).

-- ---------------------------------------------------------------------------
-- rate_events: a tiny ledger for endpoints that don't leave a row (get_deck,
-- sign-photos). Deny-all RLS; only SECURITY DEFINER / service_role touch it.
-- ---------------------------------------------------------------------------
create table public.rate_events (
  id         bigint generated always as identity primary key,
  profile_id uuid not null,
  action     text not null,
  created_at timestamptz not null default now()
);
create index rate_events_lookup_idx on public.rate_events (profile_id, action, created_at);
alter table public.rate_events enable row level security;
-- (no policies => no client access)

create or replace function public.check_rate_limit(
  p_profile uuid, p_action text, p_max int, p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- self-prune this user's old events for this action
  delete from public.rate_events
  where profile_id = p_profile and action = p_action and created_at < now() - p_window;

  if (select count(*) from public.rate_events
        where profile_id = p_profile and action = p_action) >= p_max then
    raise exception 'rate_limit: too many % requests, please slow down', p_action
      using errcode = 'check_violation';
  end if;

  insert into public.rate_events (profile_id, action) values (p_profile, p_action);
end;
$$;

grant execute on function public.check_rate_limit(uuid, text, int, interval) to service_role;

-- ---------------------------------------------------------------------------
-- messages: 30 / minute / user  (count own recent rows)
-- ---------------------------------------------------------------------------
create index messages_sender_created_idx on public.messages (sender_id, created_at);

create or replace function public.rate_limit_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.messages
        where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limit: too many messages, please slow down'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.rate_limit_messages();

-- ---------------------------------------------------------------------------
-- reports: 10 / hour / user  (count own recent rows)
-- ---------------------------------------------------------------------------
create index reports_reporter_created_idx on public.reports (reporter_id, created_at);

create or replace function public.rate_limit_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reports
        where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limit: too many reports, please try again later'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.rate_limit_reports();

-- ---------------------------------------------------------------------------
-- get_deck: same as before, with a 60/min rate check at the top.
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

  perform public.check_rate_limit(me_id, 'get_deck', 60, interval '1 minute');

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
      c.id, c.display_name,
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
