-- Lock privileged profile columns (is_admin, kit_verified) at the DB layer.
--
-- The owner-only UPDATE policy on profiles allows a user to update their own row,
-- but that must NOT let them grant themselves admin or self-verify their kit.
-- This trigger coerces those two columns whenever the caller is one of the API
-- roles (authenticated / anon): on INSERT they're forced false; on UPDATE they
-- keep their previous value. Privileged roles are unaffected, so:
--   * the kit-review Edge Function (service_role) CAN set kit_verified, and
--   * an operator in the dashboard SQL editor (postgres) CAN set is_admin.

create or replace function public.guard_privileged_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.kit_verified := false;
    else
      new.is_admin := old.is_admin;
      new.kit_verified := old.kit_verified;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before insert or update on public.profiles
  for each row execute function public.guard_privileged_profile_fields();
