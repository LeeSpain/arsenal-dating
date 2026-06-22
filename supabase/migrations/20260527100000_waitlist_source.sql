-- Tag waitlist signups by where they came from. The same /api/waitlist endpoint
-- now serves two callers — the landing page (long-standing) and the app's
-- Coming Soon screen (recent). Storing the source per row lets the dashboard
-- segment, lets us see when traffic shifts after launch, and lets the founder
-- decide who to message first when going live.
--
-- Existing rows are backfilled with 'landing' implicitly: ALTER TABLE …
-- ADD COLUMN … NOT NULL DEFAULT in modern Postgres applies the default to
-- existing rows in O(1) without rewriting the table.

alter table public.waitlist
  add column source text not null default 'landing'
    check (source in ('landing', 'app'));

-- (No separate UPDATE backfill needed — the NOT NULL DEFAULT covers existing
-- rows. New INSERTs that omit `source` keep getting 'landing'; that's the
-- safer default since the landing form has been live longer than the app's
-- Coming Soon screen.)
