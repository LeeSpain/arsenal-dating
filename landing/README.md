# Arsenal Dating — landing

A standalone pre-launch landing page for **arsenaldating.com**. Completely
**independent of the app**: its own `package.json`, `node_modules`, config, and
environment. It does **not** import from the app or touch the app's Supabase
project or migrations.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in the LANDING Supabase keys (below)
npm run dev                  # http://localhost:3000
```
The page renders without keys; the waitlist form needs the keys to actually store.

## Waitlist storage — a SEPARATE Supabase project (never the app's)
1. Create a **new** Supabase project (an EU region is sensible for GDPR).
2. In its **SQL Editor**, run [`waitlist.sql`](./waitlist.sql).
3. **Settings → API**: copy the **Project URL** and **anon / publishable key** into `.env.local`:
   ```
   LANDING_SUPABASE_URL=https://your-landing-project.supabase.co
   LANDING_SUPABASE_ANON_KEY=sb_publishable_xxx
   ```
Emails are **insert-only** via the anon key (RLS blocks reads through the API).
Export the list at launch from **Table editor → waitlist → Export to CSV**.

## Deploy (Vercel)
- New Vercel project → **Root Directory = `landing`**.
- Add env vars `LANDING_SUPABASE_URL` and `LANDING_SUPABASE_ANON_KEY`.
- Point the domain `arsenaldating.com` at it.

## Notes
- Fonts: Archivo (display) + Inter (body) via `next/font`.
- The cannon mark is an **original** stylised design — not Arsenal's crest/logo.
- Footer carries the required disclaimer: *"An independent fan project. Not
  affiliated with, endorsed by, or connected to Arsenal Football Club."*
