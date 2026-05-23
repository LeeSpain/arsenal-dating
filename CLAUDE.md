# CLAUDE.md — Arsenal Dating

> Lean, always-loaded rules. The full blueprint is in **BUILD_SPEC.md** — read that when starting or resuming the build.

## What we're building
A dating + community app for Arsenal FC supporters worldwide. A passion project: "Built by a Gooner, for Gooners." Keep copy honest and grassroots, not corporate.

## Stack (do not substitute without asking)
- Frontend: React Native + Expo (iOS, Android, web)
- Backend: Supabase (auth, Postgres, storage, real-time)
- AI: Anthropic API (only where BUILD_SPEC says)
- Payments: Stripe + Apple/Google IAP — PHASE 2, not now

## The MVP boundary (this is the line)
Build ONLY: sign-up/auth, 18+ age gate, Arsenal kit photo, questionnaire, profile creation, swipe deck, matching, messaging (women-message-first), report/block.
Everything else — Arsenal Brain, trivia/medals, pub directory, AI outreach, equity platform, social automation, AI moderation, subscriptions — is PHASE 2/3. Do NOT build it now. Note it and move on.

## Rules that don't change
1. MVP first. If it's not in the list above, it doesn't get built yet.
2. Safety is MVP: women-message-first, report, block — all in the first build.
3. Don't lock newbies out: the questionnaire BOOSTS match ordering, it never filters someone into an empty deck. A new fan still gets a full deck.
4. Lean infrastructure: use Supabase's managed services, don't hand-roll auth or servers.
5. Ask before guessing on anything legal, payment, or privacy related. Founder is EU-based — GDPR applies to photos and location. Flag it, don't invent a fix.

## Build order
Scaffold → auth + age gate → profile/photo/questionnaire → preferences → swipe + matching → messaging → report/block → test on device → small closed test with real fans.
