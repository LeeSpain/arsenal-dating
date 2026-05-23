-- Step 3 — profile completion, photo storage, kit review.
--
-- Adds onboarding progress + kit-review state + an admin flag to profiles, and
-- creates two PRIVATE Storage buckets with owner-scoped RLS:
--   * photos     — profile photos. Authenticated users may read (deck shows them
--                  via short-lived signed URLs); only the owner can write.
--   * kit-photos — Arsenal kit photos for manual review. Owner-only at the DB
--                  layer; the admin reviews them through the kit-review Edge
--                  Function (service role), so no public/admin read policy is
--                  needed here. is_admin is enforced in that function, never by
--                  hiding UI.

-- ---------------------------------------------------------------------------
-- profiles: onboarding step tracker, kit review state, admin flag
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column onboarding_step text not null default 'profile'
    check (onboarding_step in ('profile','kit_photo','questionnaire','preferences','completed')),
  add column kit_review_status text not null default 'none'
    check (kit_review_status in ('none','pending','approved','rejected')),
  add column is_admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- Storage buckets (both PRIVATE)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('kit-photos', 'kit-photos', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage RLS — objects are namespaced under the owner's auth uid:  <uid>/<file>
-- ---------------------------------------------------------------------------

-- photos: any authenticated user may read (so the deck can sign others' photos);
-- only the owner may write/replace/delete their own files.
create policy "photos read (authenticated)"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos');

create policy "photos insert (owner)"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos update (owner)"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos delete (owner)"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- kit-photos: OWNER ONLY at the DB layer (incl. read). The admin reads them via
-- the kit-review Edge Function using the service role, which bypasses RLS.
create policy "kit-photos all (owner)"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'kit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'kit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
