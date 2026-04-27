# Handoff: Playwright Stagecraft — Homepage

## Overview

**Playwright Stagecraft** is a free, open-source gamified learning app that teaches Playwright (the browser-automation testing framework) to would-be QA testers. Users write real Playwright tests against fictitious websites, against Given/When/Then acceptance criteria, and an LLM grades them on selector quality, assertion quality, AC coverage, and code quality — not just pass/fail.

This handoff covers the **homepage only**. Onboarding, the IDE/challenge flow, and profile screens are separate and will be handed off later.

The product's visual identity is **Playful Theater**: dark emerald stage, red velvet curtain framing the page, comedy/tragedy theater masks as tutor mascots, Acts I/II/III as difficulty tiers, "Playbill" as the profile page concept. Serif display type (Instrument Serif) for theater-program feel, JetBrains Mono for code-forward accents.

## About the Design Files

The files bundled here — `Playwright Stagecraft Homepage.html` plus its JSX modules — are **design references created in HTML**. They are prototypes showing intended look and behavior, not production code to copy directly.

The task is to **recreate these designs in the target codebase's environment** (a fresh Next.js / React app is the likely target since the IDE needs Monaco + a Playwright runtime) using the codebase's established patterns and libraries. If no codebase exists yet, **Next.js 14 App Router + Tailwind + Framer Motion** is the recommended stack — Monaco Editor and a sandboxed Playwright runtime will be needed for later screens.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and interactions are all specified with final values. Recreate pixel-perfectly, adapting only where the target framework's idioms require it (e.g., using Tailwind utilities instead of inline OKLCH, using `next/image` instead of raw `<img>` tags for the masks).

## Screens / Views

### 01 — Homepage (single screen, vertically stacked sections)

**Purpose**: Marketing landing page. Introduce the product, show the mascot personality, let users pick a difficulty tier, explain how challenges work, preview the rubric, and tease the XP/progression system.

**Design canvas**: 1440 × 2000 px artboard. Responsive design is out of scope for this first pass — the mock is desktop-only. Tablet/mobile can be handled in a follow-up once structure lands.

**Layout** (top to bottom):

1. **Nav bar** (height ~96px, padding 26px/56px)
2. **Hero section** (~720px tall, two-column grid 1fr / 1.1fr, padding 40px 160px 40px 120px)
3. **Difficulty tiers — "Choose your act"** (three-column grid, padding 60px 120px 40px)
4. **How it works — "Three scenes, every challenge"** (three-column grid, padding 70px 120px)
5. **Rubric + Playbill split** (two-column 1.15fr / 1fr, padding 50px 120px 90px)
6. **Footer** (padding 28px 120px 36px, border-top)

The entire page is framed by a **red velvet curtain** (background layer, non-interactive, `position: absolute; inset: 0` with a 2px bleed).

---

### Components

#### Page frame: Curtain

- Single PNG asset (`masks/curtain-frame.png`) stretched to fill the entire page with 2px negative inset on all sides so there's no white fringe.
- The PNG contains both drapes + scalloped valance baked in, with a transparent center revealing the dark-emerald stage background.
- Two overlay gradients on top of it:
  - **Footlight glow**: top 240px, `radial-gradient(ellipse 50% 100% at 50% 0%, oklch(0.95 0.10 85 / 0.22), transparent 70%)`
  - **Stage floor vignette**: bottom 320px, `linear-gradient(to top, oklch(0.07 0.01 160), transparent)`

#### Nav bar

- Left: duo-mask logo (44×44, `masks/Duo-original.png`) with green drop-shadow + wordmark **"Playwright *Stagecraft*"**
  - "Playwright" — Instrument Serif, 26px, off-white
  - "*Stagecraft*" — Instrument Serif italic, 26px, emerald `oklch(0.82 0.16 152)`
- Right: inline links — Challenges · Playbill · Docs · Sign in (14px, `oklch(0.78 0.02 80)`)

#### Hero — left column

- **Kicker pill**: "ACT I · SCENE 1" — JetBrains Mono 11px, uppercase, letter-spacing 0.14em, with a 6px glowing green dot. Pill: `oklch(0.28 0.06 155 / 0.5)` bg, `oklch(0.42 0.08 155)` border, 99px radius, padding 8px/14px.
- **Headline** — Instrument Serif 104px, line-height 0.96, letter-spacing -0.025em, `text-wrap: balance`:
  > Learn Playwright
  > *like a playwright.*

  Second line is `<em>` with emerald color `oklch(0.82 0.16 152)`.
- **Sub-headline** — Geist 19px, line-height 1.55, max-width 500, `oklch(0.82 0.02 80)`:
  > Fictitious websites become your stage. Acceptance criteria become your script. Write real Playwright tests — a thoughtful AI grades not just whether they pass, but *how well they were written.*
- **Primary CTA** — "Raise the curtain →"
  - bg: `linear-gradient(180deg, oklch(0.74 0.17 152), oklch(0.58 0.15 152))`
  - color: `oklch(0.12 0.04 160)` (near-black)
  - border: `1px solid oklch(0.82 0.14 152)`
  - padding 16px/26px, 12px radius, 16px Geist medium
  - shadow: `0 12px 40px oklch(0.60 0.16 152 / 0.4), inset 0 1px 0 rgba(255,255,255,0.3)`
- **Secondary CTA** — "Watch 90s overview" (ghost, 1px border `oklch(0.35 0.02 160)`)
- **Tech chips row** — "· Monaco IDE · Real Playwright runtime · BYO LLM key" — JetBrains Mono 11px uppercase, `oklch(0.60 0.02 80)`

#### Hero — right column (Stage)

- 620×520 container, flex-centered
- **Spotlight pool**: `radial-gradient(ellipse 60% 55% at 50% 55%, oklch(0.95 0.08 85 / 0.22), transparent 70%)`, blur(6px)
- **Stage shadow** below masks: radial, behind floor
- **Sad mask** (stage-left, slightly back): `ImgMask` with mood `sad`, size 260, tilt -14deg. Animates `pq-float-sad` 7s infinite ease-in-out.
- **Happy mask** (stage-right, forward): `ImgMask` with mood `happy`, size 340, tilt +8deg. Animates `pq-float-happy` 6s infinite ease-in-out. Z-index above sad.

Both masks get **mouse parallax** — the happy mask translates in-phase with the cursor (up to ±10px/±8px), the sad mask in opposing phase (up to ±14px/±10px), creating dimensional depth.

#### Difficulty tiers (three cards, identical layout)

Card: 300px min-height, 18px radius, padding 28px, `linear-gradient(180deg, oklch(0.20 0.02 160 / 0.85), oklch(0.14 0.015 160 / 0.92))` bg, `1px solid oklch(0.30 0.03 160)` border, `backdrop-filter: blur(6px)`.

Top-right corner: 92×92 colored mask image, floated over the card, with drop-shadow.

Content stack:
- Status tag — "NOW PLAYING" (green) or "COMING SOON" (gray) — JetBrains Mono 11px uppercase
- Label — "Act I" / "Act II" / "Act III" — Instrument Serif 48px
- Sub-label — "Apprentice" / "Understudy" / "Lead Role" — italic, 13.5px
- Description — 14px Geist, `oklch(0.80 0.02 80)`, max-width 320
- Footer row (border-top dashed `oklch(0.36 0.02 160)`, 18px pad-top): `+{xp} XP per scene` (left, green mono) / `Enter →` or `—` (right)

Three tiers:

| id | label | sub | desc | xp | ready | img |
|---|---|---|---|---|---|---|
| easy | Act I | Apprentice | Single-page flows, forgiving DOM, plenty of role-based landmarks. | 50 | ✓ | `masks/single-happy-lime.png` |
| med | Act II | Understudy | Multi-step journeys, state transitions, the occasional red herring. | 150 | ✓ | `masks/single-deep-blue.png` |
| hard | Act III | Lead Role | Dynamic classes, race conditions, network intercepts, no second takes. | 300 | ✗ | `masks/single-sad-royal-purple.png` |

#### How it works (three columns, separated by 1px left-border)

Each column: giant Roman numeral (Instrument Serif 128px, `oklch(0.32 0.05 155)` muted green), then title (Instrument Serif 30px), then 15px Geist description `oklch(0.76 0.02 80)`:

1. **I · Read the script** — A client brief plus Given/When/Then acceptance criteria. No ambiguity about what counts as done.
2. **II · Write the test** — Monaco IDE with Playwright types pre-loaded. Autocomplete ranks getByRole before anything brittle.
3. **III · Get graded** — The masks review selectors, assertions, coverage, and code quality — with line-level comments.

#### Rubric + Playbill

**Rubric (left, 1.15fr)**: Section header ("THE RUBRIC" / "How the masks judge you"), then four rows. Each row is a grid `220px | 1fr | 58px`:
- Left: Instrument Serif 22px title + JetBrains Mono 11px hint
- Middle: 8px-tall pill progress bar. Track `oklch(0.24 0.02 160)`. Fill `linear-gradient(90deg, oklch(0.60 0.16 152), oklch(0.82 0.15 152))`. Width = `{weight * 2.5}%`.
- Right: `{weight}%` JetBrains Mono 13px

| Rubric | Weight | Hint |
|---|---|---|
| Selector Quality  | 35% | getByRole > testid > CSS |
| Assertion Quality | 25% | web-first, always |
| AC Coverage       | 25% | every Given / When / Then |
| Code Quality      | 15% | await, structure, names |

**Playbill card (right, 1fr)**: 20px radius, 32px padding, emerald gradient bg, with a faded happy-green mask in the bottom-right corner (absolute, 200×200, opacity 0.5).

Content:
- Kicker: "your playbill" (mono 11px uppercase, green)
- Level: "Level 3" (Instrument Serif 66px)
- Subtitle: "Understudy in Training" (14px)
- XP row: "420 XP  /  750 XP to Act II" (mono 12px, space-between)
- XP bar: same gradient as rubric bars, 56% filled
- Badge pills (flex-wrap gap 8px): unlocked pills show `✦ {name}` in green, locked show `🔒 {name}` muted. Sample: `first-green`, `no-timeouts`, `role-based` (unlocked); `archaeologist` (locked).

#### Footer

Mono 12px, `oklch(0.58 0.02 80)`, border-top `oklch(0.24 0.02 160)`:
- Left: "Free & open. Bring your own LLM key."
- Right (60% opacity): "Hint — try ↑↑↓↓←→←→BA on the homepage."

## Interactions & Behavior

### Mask — `ImgMask` component

See `imageMask.jsx` for the full source. Key contract:

```jsx
<ImgMask
  mood="happy"   // one of: happy, happyGreen, happyLime, happyIcy, happySalmon,
                 //         happyPurple, sad, sadAqua, sadBlue, sadPink, angry
  size={340}     // pixels (width = height)
  tilt={8}       // degrees; rotation applied via transform
  winking={bool} // swap to wink frame (only supported for `happy` right now)
  hidden={bool}  // scale to 0.82 + opacity 0.55 (used for the sad-hides-behind-happy gag)
  glow={true}    // drop-shadow using a mood-derived glow color
  onClick={fn}   // optional; renders as button with keyboard focus
/>
```

- Each mood resolves to a PNG in `masks/`. `happy` uses `wink-frame-02.png` as default; clicking or scheduled blink swaps to `wink-frame-01.png` (toothier laugh).
- Preload the wink frame with a hidden `<img>` so the first swap is instant.
- For moods without a dedicated wink frame, a tiny SVG overlay paints a mask-colored arc over one eye (`EyeLid` component) — used as a fallback wink for any mood.

### Hero — `StageMasks` component

Tracks three state bits:
1. **`mouse`** — normalized cursor position relative to the stage center, clamped to [-1, 1] in both axes. Updated on every `mousemove`.
2. **`wink`** — boolean. Scheduled blink every `4200 + random(3200)` ms; wink state holds for 340ms then clears. Clicking the happy mask also sets it for 380ms.
3. **`hidingMode`** — boolean controlled by the parent. When true, the sad mask slides from left:6% to left:38%, scales to 0.82, and fades to opacity 0.55 (it "hides behind" the happy mask). Transition: `left 0.75s cubic-bezier(.2,.7,.3,1)`, same for `top`.

Idle floats:
```css
@keyframes pq-float-happy {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-12px) rotate(0.6deg); }
}
@keyframes pq-float-sad {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(10px) rotate(-0.4deg); }
}
```

### Click behaviors (parent-driven)

- **Happy mask click** → wink + speech bubble appears for 2400ms at `{ text: '"Green is web-first. Well played."', side: 'right' }`
- **Sad mask click** → `hidingMode` on for 2400ms + speech bubble `{ text: '"Brittle selectors make me nervous..."', side: 'left' }`
- **Ensemble mask click** → boosts that mask's orbit speed to ~3.2× for 2.5s, glows it, and pops a Playwright tip in a speech bubble for 3.2s.

### Ensemble — orbiting supporting cast (`cast: 'Ensemble'`)

Twelve supporting masks orbit the central duo on two rings. Each carries a **real Playwright tip** and is clickable.

- **Inner ring** (6 masks, radius 285×170, +14°/s clockwise): `happyLime`, `sadAqua`, `happyIcy`, `happyYellow`, `cheekyPurple`, `sadSlate`
- **Outer ring** (6 masks, radius 360×220, −10°/s, counter-clockwise): `sadPink`, `happySalmon`, `sadBlue`, `happyPink`, `happySteel`, `sadDeepRed`

**Critical implementation detail — angle integration:** Each mask's current angle is stored in a `useRef` array (`anglesRef`) and updated each animation frame as `angle += direction * currentSpeed * dt`. **Do not** compute angle as `baseAngle + speed * elapsedTotal` — when `speed` changes (boost), that formula multiplies the entire elapsed time by the new speed and teleports the mask to a new angle. Integrating the delta keeps motion continuous through speed changes.

```js
// Per-mask integrated angle in a ref, advanced frame-by-frame
const anglesRef = useRef(ENSEMBLE_CAST.map(c => c.baseAngle));
const tick = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000); // clamp for tab-blur safety
  ENSEMBLE_CAST.forEach((c, i) => {
    const baseSpeed = c.ring === 'inner' ? 14 : 10;
    const speed = (boost[i] || 0) > t ? baseSpeed * 3.2 : baseSpeed;
    anglesRef.current[i] += c.dir * speed * dt;
  });
  forceTick(); // trigger re-render
  raf = requestAnimationFrame(tick);
};
```

**Boost state**: `{ [maskIndex]: untilOrbitTime }` — a Map of which masks are currently boosted. On click, set `boost[i] = orbitT + 2.5`.

The 12 ensemble tips (one per mask, in order):
1. "getByRole survives refactors. CSS selectors don't."
2. "await expect(locator).toBeVisible() — web-first, never timeout."
3. "page.route() lets you mock the network without leaving Playwright."
4. "Use trace.viewer to time-travel through your test — actions, network, console, all there."
5. "page.pause() drops you into the inspector mid-test. Try it once, you'll never go back."
6. "Flaky tests usually mean missing waits. Lean on web-first assertions, not setTimeout."
7. "test.step() turns a test into a readable trace."
8. "Fixtures > beforeEach. Composable, typed, parallel-safe."
9. "A trace.zip is worth a thousand console.logs."
10. "codegen writes your first draft. You're still the playwright."
11. "page.locator() is lazy — it doesn't query the DOM until you call .click() or expect."
12. "expect(locator).toHaveText() retries. expect(locator.textContent()).toBe() does not."

### Speech bubble

- 14px padding 11/16, radius 14, bg `oklch(0.96 0.03 80)`, color `oklch(0.22 0.02 160)`, JetBrains Mono 13px, max-width 260, shadow `0 14px 40px rgba(0,0,0,0.45)`.
- Fade + lift on show/hide (opacity 0→1, translateY 6px→0, 180ms).
- 14×14 rotated-45deg diamond tail at `left: 28, bottom: -7`.
- **Critical**: render the bubble inside a sibling `position: absolute; inset: 0; pointer-events: none` overlay *next to* `<StageMasks>`, not inside it. If the bubble sits as a regular flex child of the stage container, mounting/unmounting it reflows the layout and shifts the masks. The overlay pattern keeps the bubble out of flex flow entirely.

```jsx
<div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
  <StageMasks ... />
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25 }}>
    {bubble && <SpeechBubble2 {...bubble} />}
  </div>
</div>
```

Bubble x/y use `calc()` against the overlay center so they anchor relative to the stage regardless of viewport: `x: bubble.side === 'right' ? 'calc(50% + 80px)' : 'calc(50% - 320px)'`.

### Konami code easter egg

Listens on `window` for the sequence `↑ ↑ ↓ ↓ ← → ← → b a`. On completion, overlay shows **"✦ Encore! ✦"** in Instrument Serif 54px, emerald `oklch(0.82 0.18 152)` with a strong glow `0 0 40px oklch(0.72 0.20 152 / 0.9)`. Auto-dismisses after 5500ms.

The sequence index resets on any wrong key.

## State Management

Hero section (`TheaterHomeV2`) holds four pieces of component-local state:

```js
const [bubble, setBubble] = useState(null);    // { text, side } | null
const [hiding, setHiding] = useState(false);   // sad-mask hiding-behind-happy
const [konami, setKonami] = useState(false);   // easter-egg overlay shown
const [ki, setKi] = useState(0);               // konami sequence cursor
```

`StageMasks` adds three more pieces of internal state for the ensemble:

```js
const [mouse, setMouse] = useState({ x: 0, y: 0 }); // parallax
const [wink, setWink] = useState(false);            // scheduled blink
const [boost, setBoost] = useState({});             // { [idx]: untilOrbitTime }
const [activeIdx, setActiveIdx] = useState(null);   // currently-glowing ensemble mask
const anglesRef = useRef(ENSEMBLE_CAST.map(c => c.baseAngle));
const orbitTRef = useRef(0);
```

`anglesRef` and `orbitTRef` are **refs**, not state — they're updated every animation frame and would cause excessive re-renders as state. A separate `useReducer((x) => x + 1, 0)` provides the `forceTick` to schedule a render after each frame's integration step.

### Tweakable defaults (homepage props)

The homepage takes three props that drive its appearance. In the prototype these are persisted via the in-page Tweaks panel; in production, decide whether they should be route params, theme context, or just constants:

```js
TheaterHomeV2({
  mood: 'Opening Night',  // 'Opening Night' | 'Matinee' | 'Black Box' | 'Limelight'
  cast: 'Ensemble',       // 'Solo' | 'Duo' | 'Ensemble'
  drama: 'Theatrical',    // 'Calm' | 'Lively' | 'Theatrical'
})
```

- **mood** swaps the stage background gradient + footlight color + curtain filter.
- **cast** controls how many masks are visible: Solo = happy only, Duo = happy + sad, Ensemble = duo + 12 orbiting supporters.
- **drama** controls motion intensity: Calm disables blink + curtain sway, Theatrical enables both with stronger amplitude.

The shipped prototype defaults to `Opening Night / Ensemble / Theatrical` (the user's chosen settings).

All of these are ephemeral UI state — no persistence needed on the homepage beyond the user's mood preference (consider localStorage). No data fetching on the homepage.

When building the real IDE challenge flow (future handoff), persistent state will include:
- User profile (XP, level, badges, unlocked acts) — server-side
- Current challenge draft (test source code, run history) — localStorage + server-side
- LLM API key — localStorage only, never sent to your backend

## Design Tokens

### Colors (OKLCH → approximate hex for reference)

| Token | OKLCH | ~Hex | Usage |
|---|---|---|---|
| Stage bg dark | `oklch(0.09 0.01 160)` | `#0d1310` | Page background base |
| Stage bg mid | `oklch(0.13 0.015 160)` | `#171e1a` | Page background mid |
| Stage bg light | `oklch(0.22 0.03 155)` | `#2a3a2f` | Page background top of radial |
| Card bg start | `oklch(0.20 0.02 160 / 0.85)` | — | Difficulty cards |
| Card bg end | `oklch(0.14 0.015 160 / 0.92)` | — | Difficulty cards |
| Card border | `oklch(0.30 0.03 160)` | `#3a4a40` | Cards + rules |
| Emerald primary | `oklch(0.82 0.16 152)` | `#6edd97` | Accent / italic headlines |
| Emerald mid | `oklch(0.72 0.14 152)` | `#4fc180` | Kickers, XP bars |
| Emerald deep | `oklch(0.60 0.16 152)` | `#2aa45f` | CTA gradient end |
| Emerald CTA start | `oklch(0.74 0.17 152)` | `#4dc87c` | CTA gradient start |
| Text primary | `oklch(0.95 0.02 80)` | `#f2efe7` | Headings, hero text |
| Text secondary | `oklch(0.82 0.02 80)` | `#d1cdc2` | Sub-copy |
| Text tertiary | `oklch(0.60 0.02 80)` | `#968f80` | Mono labels, metadata |
| Speech bubble bg | `oklch(0.96 0.03 80)` | `#f6f1e1` | Cream bubble |
| Curtain red | (from PNG asset — approximate `#600000` velvet) | — | Frame |
| Tassel gold | (from PNG asset — approximate `#b88a3a`) | — | — |
| Warm glow | `oklch(0.95 0.10 85 / 0.22)` | — | Footlight |

Use OKLCH directly in Tailwind config via `@property` or `theme.colors` arbitrary values — the color palette was deliberately chosen in OKLCH for perceptually-even steps. Don't flatten to HSL.

### Typography

- **Display** — Instrument Serif (Google Fonts). Italics 0 + italic. Used at 104/66/60/48/30/22 px. Always letter-spacing -0.01em to -0.025em (tighter at large sizes).
- **Body/UI** — Geist, weights 300/400/500/600. Used at 19/15/14/13.5 px.
- **Mono/code** — JetBrains Mono, weights 400/500/600. Used at 13/12/11/10 px, often uppercase with letter-spacing 0.14em to 0.18em.

All three loaded via a single Google Fonts request:
```
https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap
```

### Spacing scale

Used: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 38, 40, 48, 56, 60, 70, 90, 120, 160 px. Not on a strict 8-point grid — section paddings were tuned by eye. Keep the tuned values.

### Radii

- 12 px — CTA buttons
- 14 px — speech bubble
- 18 px — difficulty cards
- 20 px — Playbill card
- 99 px — pills and progress tracks

### Shadows

- CTA: `0 12px 40px oklch(0.60 0.16 152 / 0.4), inset 0 1px 0 rgba(255,255,255,0.3)`
- Speech bubble: `0 14px 40px rgba(0,0,0,0.45)`
- Mask glow (dynamic per mood): `drop-shadow(0 22px 48px <mood-glow>) drop-shadow(0 4px 14px rgba(0,0,0,0.4))`
- Card shadow: intentionally none — depth comes from gradient + border

## Assets

All assets are in the `masks/` folder of this handoff. They're AI-generated theater masks chroma-keyed to transparent PNG — **not** Playwright's trademarked marks (see Legal section below).

### Mask PNGs (1000×1000 or 1254×1254, transparent bg)

The mask PNGs are AI-generated theater masks with **clean alpha channels** (no fake-alpha squares). When swapping mask files in production, the prototype uses a `?v3` query-string cache-buster on every image URL — keep this pattern (or use proper hashed filenames at build time) so updates aren't masked by browser caching.

| File | Mood key | Usage |
|---|---|---|
| `wink-frame-02.png` | `happy` | **Primary** happy mask (relaxed eyes) |
| `wink-frame-01.png` | (wink frame) | Big toothy laugh, swapped in for ~340ms on wink |
| `single-happy-green.png` | `happyGreen` | Generic happy-green fallback |
| `single-happy-lime.png` | `happyLime` | Act I card / "Level Up" / inner ring |
| `single-happy-icy-blue.png` | `happyIcy` | "Pro Tip" / inner ring |
| `single-happy-salmon.png` | `happySalmon` | Warm-happy / outer ring |
| `single-sad-royal-purple.png` | `happyPurple` | Act III card (locked) — actually a grin |
| `single-happy-yellow.png` | `happyYellow` | Inner ring (new) |
| `single-happy-pink.png` | `happyPink` | Outer ring (new) |
| `single-happy-steel.png` | `happySteel` | Outer ring (new) |
| `single-happy-sky.png` | `happySky` | Reserved for future use (new) |
| `single-cheeky-purple.png` | `cheekyPurple` | Inner ring (new — half-lidded smirk) |
| `single-sad-orange.png` | `sad` | **Primary** sad mask |
| `single-sad-pink.png` | `sadPink` | "Nudge" / outer ring |
| `single-deep-blue.png` | `sadBlue` | Act II card / "Tutor" / outer ring |
| `single-exasperated-aqua.png` | `sadAqua` | "Warning" / inner ring |
| `single-sad-yellow.png` | `sadYellow` | Reserved (new) |
| `single-sad-slate.png` | `sadSlate` | Inner ring (new) |
| `single-sad-deep-red.png` | `sadDeepRed` | Outer ring (new) |
| `single-angry-red.png` | `angry` | "Hard Fail" mood |
| `Duo-original.png` | (logo) | Nav logo (red + green duo) |
| `duo-greens.png` / `duo-blues.png` / `duo-purples.png` / `duo-reds.png` / `duo-royal.png` | (alt duos) | Alt duo variants (future use) |

### Curtain PNG

| File | Usage |
|---|---|
| `curtain-frame.png` | Page frame (724×2172, transparent center, scalloped valance top, red side drapes) |

## Legal notes

Playwright is an open-source project with a theater-mask logo owned by Microsoft. The masks used here are **original, AI-generated theater-mask characters** — not copies of Playwright's logo. The theater-mask concept itself (Thalia + Melpomene) is an ancient archetype in the public domain.

**If this app ships**: do not imply endorsement by Microsoft or the Playwright team unless they actually endorse it. If they do, ask them to license their real marks to you and swap the placeholders.

## Files

The homepage implementation lives in three files (all bundled in this handoff):

- `Playwright Stagecraft Homepage.html` — page shell, Google Fonts, React/ReactDOM/Babel CDN imports, mounts the app via `<DesignCanvas>` (a prototype chrome — **strip this when porting**; the real app will just render `<TheaterHomeV2 />` at the root).
- `theaterHomeV2.jsx` — the homepage itself: `TheaterHomeV2`, `StageMasks`, `SpeechBubble2`, `Curtain`, `SectionHeader2`. Plus the mask cast sheet lives at the bottom of the HTML file's inline script.
- `imageMask.jsx` — the `ImgMask` component + `MASK_IMG` mood→file map + `EyeLid` SVG fallback.

When porting:
1. Drop `<DesignCanvas>` — it's prototype-only scaffolding.
2. Drop `MaskCastSheet` — it's a reference/spec card, not part of the product.
3. Convert `ImgMask` to your framework's image component (`next/image`, etc.)
4. Replace inline styles with Tailwind or your CSS solution of choice. The design uses OKLCH — preserve it (Tailwind 4 and modern browsers support it natively).
5. Extract `<Curtain />` and `<StageMasks />` as reusable components — they'll show up again in onboarding and victory screens.
6. Extract the Konami handler — it's a cross-page easter egg.

## Open questions / Next up

Things deliberately left out of this homepage that the next handoff rounds will cover:

- **Onboarding** (3–5 screens: meet the masks, enter LLM key, choose first challenge)
- **Challenge page** (the Monaco IDE, the fictitious site iframe, the brief + AC panel, run output)
- **Grading screen** (the masks' rubric feedback, line-level code comments)
- **Playbill / profile page** (full XP history, badges, completed acts)
- **Tablet/mobile breakpoints** for all of the above

---

*Created with design tooling for Claude. Fidelity: hi-fi. Target platform: Next.js 14 + Tailwind + Framer Motion (recommended).*
