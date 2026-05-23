# DESIGN.md — Arsenal Dating

> Concrete design rules for the build. This is not "make it nice" — it's the exact tokens and rules to follow. If a choice isn't here, prefer clean, generous, premium defaults (Hinge/Bumble level), never cluttered.

## North star
Premium feel, grassroots heart. Matchday energy — celebration, pride, belonging — but calm and confident, not loud. Clean like a top-tier dating app, unmistakably Arsenal in colour and spirit.

---

## Colour palette (Arsenal official)

Brand colours:
- **Arsenal Red** `#EF0107` — primary action / brand accent (buttons, key highlights, the "like" action)
- **Dark Red** `#DB0007` — pressed/hover state of red elements
- **Gold** `#9C824A` — premium & achievement accent (founder badges, verified, special moments). Use sparingly; gold should feel earned.
- **Navy** `#063672` — secondary depth, headers, supporting surfaces
- **White** `#FFFFFF`

### Rule: red is an accent, not a background
Do NOT fill large surfaces with `#EF0107`. It is high-saturation and reads cheap / alarming at scale, and clashes with error states. Red is for primary buttons, the like action, and small hero moments only. The base of the app is neutral.

### Base mode: DARK (default)
- Background `#0E0F12`
- Surface / cards `#1A1C20`
- Surface raised `#24272C`
- Text primary `#FFFFFF`
- Text secondary `#A8ADB5`
- Border / divider `#2E3238`
(If we switch to light mode later: background `#FFFFFF`, surface `#F5F6F8`, text primary `#16181C`, text secondary `#5A6068`. One-line theme flip — keep colours behind theme tokens so this is trivial.)

### Functional colours (kept separate from brand red on purpose)
- Success `#1F9E5A`
- Error / destructive `#E5484D` (deliberately NOT Arsenal red, so errors never look like brand)
- Warning `#E8A317`
- Info `#3B82F6`

---

## Typography
Use free, mobile-excellent web fonts via `expo-google-fonts`. Do NOT attempt to reproduce Arsenal's licensed club font (Clearface Gothic) — licensing risk.

- **Display / headlines:** `Archivo` (or `Archivo Expanded` for the biggest hero moments) — strong, sporty, premium.
- **UI & body:** `Inter` — extremely legible on mobile, clean, neutral.

Scale (mobile):
- Hero display 32–40, bold
- Screen title 24, bold
- Section heading 18, semibold
- Body 16, regular
- Caption / meta 13, medium
- Minimum body text never below 13.

---

## Logo & the cannon
- Use an **original, cannon-*inspired* mark that we create and own** — do NOT use Arsenal's actual crest or official cannon logo (trademark). Keep it stylised and distinct.
- Where the motif appears: app loading state, the match-celebration animation, primary empty states, and as a small detail — not plastered across every screen.
- Where it must NOT appear: inside body content, repeated as background texture, or anywhere it adds noise. Tasteful and occasional = premium. Everywhere = tacky.

---

## Layout & spacing
- **8pt spacing system:** all margins/padding/gaps are multiples of 8 (4 allowed for tight icon spacing). 8, 16, 24, 32, 48.
- Generous whitespace. Let profiles and photos breathe — space signals premium.
- **Corner radius:** cards & buttons 16, inputs 12, full-bleed images 0, avatars fully round.
- Card-based layouts. One clear primary action per screen.
- Minimum tap target 44×44pt (accessibility).

---

## Components
- **Primary button:** Arsenal red `#EF0107` fill, white text, radius 16, pressed → `#DB0007`. One primary per screen.
- **Secondary button:** transparent with border `#2E3238`, text primary.
- **Like action (swipe):** red. **Pass action:** neutral/grey, never the error red.
- **Verified / founder badges:** gold accent.
- **Inputs:** surface fill, 12 radius, clear focus state in red.
- Subtle, sharp motion only: 150–250ms transitions, gentle spring on swipe and on a match. The match moment is the one place to let the celebration breathe (brief, joyful — never a slot-machine).

---

## Voice & tone (UI copy)
- Warm, honest, fan-to-fan. Like a mate who loves the Arsenal, not a corporation.
- Show the grassroots story: somewhere visible (welcome and an About screen) say it plainly — built by a single Gooner, for Gooners, a learning start-up.
- No hype, no fake urgency, no dark patterns. Honesty is the brand.

---

## Accessibility
- Text contrast: meet WCAG AA minimum (Arsenal red on white is AAA; check red text on dark surfaces and adjust if it fails).
- Don't rely on colour alone to convey state — pair with icon or label.
- Respect system text-size settings.

---

## Hard don'ts
- No red backgrounds at scale.
- No Arsenal official crest/logo/cannon (trademark) — original mark only.
- No clutter, no more than one primary action per screen.
- No dark patterns, no manipulative copy.
- Don't reproduce the club's licensed font.
