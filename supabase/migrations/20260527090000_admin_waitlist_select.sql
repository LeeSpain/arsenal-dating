-- Admin can read the waitlist (Control Centre listing + CSV export).
-- Mirrors the admin-read policy on founder_messages: server-enforced via the
-- caller's is_admin flag, with the SELECT grant narrowed by the policy.
--
-- Insert-only behaviour for everyone else is preserved (anon still has no
-- SELECT policy, so the list still can't be read through the public API).

create policy "admin reads waitlist"
  on public.waitlist
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p
             where p.auth_id = auth.uid() and p.is_admin = true)
  );

grant select on public.waitlist to authenticated;
