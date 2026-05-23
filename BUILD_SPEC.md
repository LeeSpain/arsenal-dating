# CLAUDE.md — Arsenal Dating (working title: ArsenalDating.com)

> This is the build spec for Claude Code. Read it fully before scaffolding anything.
> It defines the MVP, the stack, the data model, the screens, and the rules.
> Anything marked **PHASE 2** or **PHASE 3** is explicitly OUT OF SCOPE for the first build. Do not build it. Do not stub elaborate versions of it. Note it and move on.

---

## 1. What this is

A dating and community app for Arsenal FC supporters worldwide. Built by a single Arsenal fan, for Arsenal fans. It is a passion project and a learning start-up — that tone matters and should be reflected in copy, not hidden behind corporate polish.

The core problem it solves: passionate Arsenal fans have nowhere to meet people who share that obsession. The app connects them, keeps them safe, and gives them a community.

**Positioning line (use in onboarding and the landing page):** "Built by a Gooner, for Gooners."

---

## 2. Guiding principles for the build

1. **MVP first, always.** A working, launchable app beats a half-built grand vision. If a feature isn't in Section 4, it does not get built now.
2. **Safety is a feature, not an afterthought.** Women-message-first, reporting, and blocking are MVP, not later.
3. **Lean infrastructure.** Use managed services (Supabase) so we are not maintaining servers or hand-rolling auth.
4. **Don't lock newbies out.** The matching logic uses the questionnaire as a *boost*, never as a hard filter that isolates newer fans. (See Section 6.)
5. **Ask before guessing on anything legal, payment, or data-privacy related.** Flag it, don't invent a solution.

---

## 3. Tech stack (decided — do not substitute without asking)

- **Frontend:** React Native with Expo (iOS, Android, and web from one codebase).
- **Backend:** Supabase — handles auth, Postgres database, file/photo storage, and real-time messaging.
- **AI:** Anthropic API (Claude) — used only where Section 4 says so.
- **Payments:** Stripe (web) + Apple/Google in-app purchase (mobile). NOTE: Apple/Google require their IAP system for digital subscriptions and take a percentage. Build payments behind a clean abstraction so the provider can differ by platform. **PHASE 2** — not in the first build.
- **Landing page:** Separate, hosted on Vercel. Not part of the app codebase.

---

## 4. MVP SCOPE (build exactly this, nothing more)

### In scope
1. **Sign-up & auth** — email or phone, via Supabase Auth.
2. **Age verification** — must confirm 18+ before proceeding. Hard gate.
3. **Arsenal kit photo** — user uploads a photo wearing an Arsenal top during onboarding. For MVP this is stored and flagged for manual review (no automated image classification yet — that's PHASE 2). Onboarding must not stall waiting on review; user proceeds, badge applied later.
4. **Questionnaire** — favourite player(s), favourite era, favourite manager, when they started supporting. Stored against the profile and feeds matching.
5. **Profile creation** — photos, short bio, what they're looking for, basic preferences (age range, distance, gender).
6. **Swipe deck** — Tinder-style: swipe right to like, left to pass.
7. **Matching** — a match occurs on mutual like. Matching is questionnaire-weighted but inclusive (Section 6).
8. **Messaging** — real-time chat between matches, with **women-message-first** enforced (Section 7).
9. **Safety basics** — report user, block user, and a clear reporting flow that reaches an admin queue.

### Explicitly OUT of MVP
- Arsenal Brain encyclopedia → **PHASE 2**
- Trivia / medals / leaderboard → **PHASE 2**
- Pub & bar partnership directory and map → **PHASE 2**
- Autonomous AI outreach (email/WhatsApp/calls to venues & creators) → **PHASE 3** *(also has legal/compliance requirements — do not build until reviewed)*
- Equity / investor crowdfunding platform → **PHASE 3** *(financial-promotion regulation — requires professional legal advice before any build)*
- Social media automation (Instagram/Reddit/Facebook/Snapchat) → **PHASE 3**
- AI-powered moderation → **PHASE 2** (MVP uses manual report queue)
- Premium subscriptions & regional pricing → **PHASE 2**

---

## 5. Data model (Supabase / Postgres)

Build these tables. Use UUID primary keys and Postgres Row Level Security so users can only read/write their own data.

- **profiles** — `id`, `auth_id`, `display_name`, `dob`, `gender`, `bio`, `looking_for`, `location` (coarse, city-level), `kit_verified` (bool), `kit_photo_url`, `created_at`.
- **photos** — `id`, `profile_id`, `url`, `order`, `is_primary`.
- **questionnaire** — `profile_id`, `favourite_players` (array), `favourite_era`, `favourite_manager`, `supporting_since` (year).
- **preferences** — `profile_id`, `min_age`, `max_age`, `max_distance_km`, `interested_in_gender`.
- **swipes** — `id`, `swiper_id`, `target_id`, `direction` (like/pass), `created_at`. Unique on (swiper_id, target_id).
- **matches** — `id`, `profile_a`, `profile_b`, `created_at`. Created when a mutual like is detected.
- **messages** — `id`, `match_id`, `sender_id`, `body`, `created_at`. Real-time via Supabase subscriptions.
- **reports** — `id`, `reporter_id`, `reported_id`, `reason`, `details`, `status`, `created_at`.
- **blocks** — `id`, `blocker_id`, `blocked_id`, `created_at`.

---

## 6. Matching logic (important — read carefully)

- A candidate deck is built from profiles matching the user's basic preferences (age, distance, gender) and excluding anyone already swiped, matched, blocked, or who blocked them.
- The questionnaire **boosts ordering**, it does NOT filter. Shared favourite era / players / manager push a profile higher up the deck.
- **Critical rule:** a newer fan (recent `supporting_since`, fewer questionnaire answers) must still receive a full, healthy deck. Never produce an empty or near-empty deck because someone didn't pick "the Invincibles." Sparse questionnaire data lowers boost weight only — it never removes candidates.
- Keep the algorithm simple and readable for MVP. No machine learning. A transparent scoring function we can tune.

---

## 7. Women-message-first rule

- On a mutual match, only the woman in the pair can send the first message.
- The other party sees the match and can see the conversation is open, but cannot send until she has.
- For same-gender or non-binary matches, fall back to: either party may message first. Handle this gracefully and without assumptions — store gender explicitly and branch on it.

---

## 8. Brand & UI direction

- **Colours:** Arsenal red as primary, crisp white, gold accents (championship energy).
- **Motif:** the cannon as a recurring brand mark (buttons, dividers, loading states). Keep it tasteful, not cluttered.
- **Tone:** premium feel, grassroots heart. Clean like Hinge/Bumble, not busy. Subtle, sharp animation — never gaudy.
- **Copy voice:** warm, honest, fan-to-fan. The "learning start-up, built by one Gooner" message should be visible (e.g. in onboarding and an About screen).
- Follow the frontend-design skill for component styling and design tokens.

---

## 9. Screen list (MVP)

1. Welcome / value prop
2. Sign-up & login
3. Age gate (18+)
4. Kit photo upload
5. Questionnaire (multi-step)
6. Profile creation (photos, bio, looking-for)
7. Preferences
8. Swipe deck (home)
9. Matches list
10. Chat / messaging
11. Profile / settings (incl. report/block access, About screen)

---

## 10. Build order (follow this sequence)

1. Scaffold project: Expo app, navigation, blank screen shells, Supabase connection.
2. Auth + age gate.
3. Profile creation + kit photo upload + questionnaire.
4. Preferences.
5. Swipe deck + matching engine.
6. Messaging (real-time, women-message-first).
7. Report/block + admin report queue.
8. Test on a real device, fix, then a small closed test with real Arsenal fans.

---

## 11. Open questions to raise with the founder (do not guess)

- Confirm data-privacy/GDPR approach before storing photos and location (founder is EU-based).
- Confirm what counts as "verified" for the kit photo before any automated check is built.
- Any payment/subscription work, equity work, or cold-outreach work must be confirmed and legally reviewed before building.

---

*End of spec. Build only Section 4. Everything else waits.*
