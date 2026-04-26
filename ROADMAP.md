# PlaywrightQuest — Roadmap & Open Decisions

This document captures decisions and open threads that diverge from the original
`PlaywrightQuest.md` brief. When a decision here conflicts with the brief, this
doc wins; `PlaywrightQuest.md` remains the architectural north star but is not
re-edited for every tactical pivot.

Last updated: 2026-04-23

---

## 1. Chunk Log (where we are)

| Chunk | Description | Status |
|-------|-------------|--------|
| 0 | Scaffold Next.js app + folder structure | done |
| 1 | Bramble & Co. static site (shop, cart, checkout) | done |
| 2 | DOM manifest for Bramble & Co. + manifest types | done |
| 3 | Monaco IDE with Playwright types + ranked autocomplete | done |
| 4 | Local execution sandbox + `/api/execute` | done (may be deprecated — see §3) |
| 5 | Corpus skeleton + keyword retrieval | done |
| 6 | BYOK multi-provider grading + `/api/grade` | done |
| 7 | Wire challenge + IDE + feedback UI end-to-end | done |
| 7.5 | `trailingSlash: true` fix (broken asset paths under `/sites/*`) | done |
| 8 | Site preview pane + popout window for DevTools | in progress |

Layer 1 checklist status (from `PlaywrightQuest.md` §9):

- [x] One fictitious site with DOM manifest
- [x] Monaco IDE with Playwright autocomplete
- [ ] 3–5 BDD challenges (only 1 authored so far — `bramble-checkout-happy-path`)
- [x] Server-side test execution sandbox — **under review, see §3**
- [x] AI grading engine
- [x] Failure archaeology in feedback panel
- [x] Basic XP scoring display

---

## 2. Preview Pane & DevTools Access (Chunk 8)

**Problem.** Players need to see the fictitious site while writing tests, and
they need Chrome DevTools to hunt for selectors. The current IDE has no preview
— only a link that opens the site in a separate tab.

**Decision.**

- Add an iframe preview panel on the right side of the IDE, tab-switched with
  the existing Challenge panel.
- Add a **popout** button that opens the site in a real browser window via
  `window.open(url, '_blank', 'popup')`. In a popped-out window, `F12` opens
  native Chrome DevTools — no custom inspector required.
- URL bar inside the preview panel lets players navigate within the site (e.g.
  `/sites/bramble-co/cart.html`) without leaving the IDE.
- After a test run completes, auto-reload the preview so players see the
  post-test DOM state.

**Why popout over embedded DevTools.** Browser security prevents a page from
opening DevTools on its own iframes. Shipping our own inspector is a huge
feature and redundant with what every player already has. Popout gives the real
thing for free.

**Two-monitor flow.** The popout is a detached `window.open` — players can drag
it to a second monitor and keep it open across test runs. The main IDE window
detects when the popout closes and re-enables the inline preview.

---

## 3. Execution Model — Architectural Pivot (under discussion)

**Original design** (`PlaywrightQuest.md` §10): player's test code is sent to a
server-side Docker sandbox, executed there, results streamed back.

**Proposed pivot.** Players install Playwright locally and run tests in their
own environment. The app provides:

1. A "Copy test" button that copies the spec to the clipboard.
2. (Future) A small CLI companion (`npx playwrightquest run <challenge>`) that
   pulls the challenge, runs `npx playwright test`, and POSTs stdout +
   pass/fail to `/api/grade`.
3. Or: a paste-results textarea so players can paste their terminal output and
   submit for grading without the CLI companion.

**Why this might be better:**

- **Zero infra.** Hosting becomes a static-ish Next.js deploy on Vercel. No
  Docker, no queue, no sandbox hardening.
- **Real developer ergonomics.** Players use their own editor, terminal, and
  browser — the experience is 1:1 with real Playwright work.
- **DevTools is native.** No need to ship our own inspector; players already
  have Chrome/Firefox DevTools.
- **Cheaper to share.** The app runs anywhere Next.js does; no per-session
  container cost.

**Why it might be worse:**

- Onboarding friction: "install Node, install Playwright, install browsers" is
  a big first step for someone who just wants to try the game.
- No "click Run, see result" magic — adds a copy/paste step unless the CLI
  companion ships.
- Grading needs to trust the player's pasted output (players can fake passes
  for bragging rights, but can't fake the grading model's quality score).

**Open question.** Keep `/api/execute` and the `LocalRunner` for dev / demo
runs, but add the local-Playwright path as the primary production flow? Or
rip out the sandbox entirely? Leaning toward keeping it for the hosted demo
challenge ("try one challenge without installing anything"), and nudging
serious players toward local install.

**Decision needed** before chunk 10.

---

## 4. Storage (open)

**Current state.** No persistence. Provider API key is in `localStorage`
(client-only, never leaves the browser). Challenges are read from disk on the
server at request time.

**What needs to persist (eventually):**

- Player progress: which challenges completed, best score per challenge, XP
  total.
- Player-authored test drafts (so closing the tab doesn't lose work).
- Hint usage per challenge (affects scoring).

**Options, cheapest first:**

1. **`localStorage` only.** Session-scoped, zero backend. Fine for v1 / self-
   hosted. Loses progress across devices.
2. **Anonymous session cookie + KV store** (Vercel KV / Upstash). Cheap, no
   auth, per-browser progress survives reloads. Still lost across devices.
3. **Auth + Postgres.** Real accounts, cross-device sync, leaderboards. Big
   jump in complexity and operational cost.

**Recommendation.** Ship with `localStorage` only. Add option 2 when the app is
deployed publicly. Defer option 3 to Layer 3.

---

## 5. Hosting & Sharing

**Target:** deploy to Vercel on a custom subdomain, shareable by URL.

**What's needed before deploy:**

- Env var strategy for BYOK — no keys should ever be stored server-side; the
  current design already enforces this.
- Rate-limit `/api/grade` (per-IP) so a shared deploy can't be griefed into
  bankrupting someone's Anthropic quota. (The grading uses the *player's* key,
  so cost exposure is theirs — but abuse can still blow up metadata/logs.)
- Remove or guard `/api/execute` if we pivot to local-only execution (§3).
- `robots.txt` / OG tags / a landing page that makes the game obvious.

**Not needed for deploy:** accounts, database, leaderboards.

---

## 6. Autocomplete — Current & Future

**Current (chunk 3).** `components/IDE/playwrightTypes.ts` ships a hand-curated
subset of Playwright type definitions wired into Monaco via
`addExtraLib`. `components/IDE/completions.ts` adds a ranked completion
provider so `getByRole` / `getByLabel` / `getByText` surface before
`getByTestId` / CSS.

**Gaps:**

- The hand-curated `.d.ts` is a subset. Trade-off: full types are heavy (~2MB)
  but give real IntelliSense for every method. Consider lazy-loading the
  official types from CDN on IDE mount — pay the download once, cache forever.
- No snippet support yet (e.g., "`pwtest`" → full `test('...', async ({ page })
  => { ... })` block). Cheap win.
- No diagnostics gating — Monaco reports unrelated TS errors because the spec
  file is parsed in isolation. Consider suppressing unreachable-code and
  no-any warnings for player files.

---

## 7. The Site-Authoring Flow (Claude Design loop)

The user is iterating on Bramble & Co.'s visual design with Claude Design in a
separate window. When a redesigned version lands, the integration shape looks
like:

- Replace `sites/bramble-co/{index,cart,checkout}.html` + `styles.css` with the
  new files.
- **Re-audit `manifest.json`** — every change to markup risks invalidating
  manifest entries (changed roles, moved elements, renamed test-ids). The
  manifest is the grading ground truth; it must stay synchronized.
- Update `challenges/bramble-checkout-happy-path.json`'s `manifestElements` if
  IDs changed.

Consider writing a manifest-lint script (`scripts/manifest-lint.ts`) that opens
each HTML file, checks every manifest entry's `ideal_locator` actually resolves
to an element, and fails loudly when the site drifts from the manifest.

---

## 8. Playwright 1-to-1 Mirror — What It Means

User's ask: "we'll need to have a version of this that can handle the fictitious
website in a manner that mirrors the experience of using Playwright so the flow
between the application and actually writing tests is 1 to 1."

Translation: when a player writes `await page.goto('/sites/bramble-co/')` and
runs their test, the site they see in the preview / popout should be exactly
the site Playwright navigates to. No auth walls, no different bundles, no
redirects, no "dev vs prod" divergence.

**Implications that are already satisfied:**

- Preview iframe and Playwright both hit `http://localhost:3000/sites/...`.
- `trailingSlash: true` now ensures both use the same URL shape.
- Static sites live in `sites/` and are served by a single route handler.

**Implications not yet satisfied:**

- If we pivot to local Playwright execution (§3), players' `baseURL` must be
  configurable so they can point at the hosted PlaywrightQuest site for
  challenges OR at a local clone. A single `PQ_BASE_URL` env var + a settings
  UI covers this.

---

## 9. Tutor Character — Real-Time Feedback Surface

**User intent (paraphrased):** a persistent tutor character anchored to the
bottom third of the screen with a speech bubble. It delivers contextual
feedback while the player writes tests (not just after grading).

**Two variants the user floated, both worth prototyping:**

1. **Inline-only tutor.** Tutor appears in the bottom-third, shows commentary
   as the player types / runs. When grading finishes, the app navigates to a
   dedicated "Grading" page (and then "Next Challenge"). The tutor stays on
   the IDE; the grading page is a separate surface.

2. **Post-submit dramatic reveal.** Player submits → the tutor appears in the
   bottom-third with a stylized "Debug mode" UI showing the grade-in-progress
   reasoning. Then the full grading page reveals. More theatrical, more
   engaging, slightly harder to execute well.

**Design constraints derived from either variant:**

- Tutor has to **not occlude the editor**. Bottom-third is a floating panel,
  probably draggable or dismissable. Speech bubble stacks above it.
- Feedback stream is **not** just the grading result. It's smaller events
  too: "you wrote `page.locator('.foo')` — that's a CSS selector, did you
  know `getByRole` is more resilient?" — without being annoying or slowing
  down a player who knows what they're doing. Needs a dial for verbosity.
- Feedback comes from the same Claude model as grading, but via a **lighter
  prompt** — the grading prompt is heavy (full manifest, rubric, corpus). An
  always-on tutor that called grade-level prompts on every keystroke would be
  prohibitively expensive. Two options: (a) debounced lightweight prompt, (b)
  client-side heuristic hints (regex checks for anti-patterns) with the AI
  tutor reserved for explicit "ask tutor" moments.
- Tutor appearance is being designed by the user in parallel (Claude Design
  session). Likely a character sprite + speech-bubble component; leave a
  named slot (`<TutorBubble message={...} />`) in the IDE layout so the art
  drops in without re-plumbing.

**Not yet decided:**

- Is the tutor the same entity as Section 8's "Helper Function Assistant"
  (Layer 2 in `PlaywrightQuest.md`)? Might be. If so, this collapses two
  features into one panel.
- Where does it live architecturally — new `components/Tutor/` module with
  its own hook (`useTutorFeedback`) that owns event subscription?
- How does the grading page relate to the IDE? SPA-style drawer over the IDE,
  or full route change? Route change is more honest to what Next.js does well;
  a drawer preserves editor state which might matter for iteration loops.

**Placeholder chunk:** Chunk 15 or later — waiting on character art + a
decision between the two variants above.

---

## 10. Playwright-Aware Editor Diagnostics (deferred)

Currently the Monaco TypeScript service shows `ts(80007): 'await' has no
effect on the type of this expression` whenever a player puts `await` in
front of a locator call (`await page.getByRole(...)`). This is technically
correct — locators are synchronous — but a beginner is likely to respond by
stripping awaits off *everything*, including the actions and assertions that
do need them. Chunk 9 suppresses code 80007 globally.

**What to build later:**

- A custom Monaco code-action / lint layer that understands Playwright
  specifically:
  - Flag `await page.getBy*` with a **specific** message: "Locators are
    synchronous — `await` belongs on the action or assertion, not the
    locator." Offer a quick-fix to remove the misplaced `await`.
  - Flag missing `await` on `expect(...)` chains and on `.click()`, `.fill()`,
    etc. Those are the ones that silently pass in unit-test dry runs but
    break real flows.
  - Flag `page.waitForTimeout(...)` in a player test. Explain auto-waiting.
- Consider driving the diagnostics off the same rubric JSON the grader uses
  — one source of truth for "what's good" instead of two.

Deferred until the grader's line-level feedback is landing reliably, so the
editor diagnostics and the grading feedback don't contradict each other.

---

## 11. Upcoming Chunks (tentative order)

| Chunk | What | Rationale |
|-------|------|-----------|
| 8 | Site preview + popout | In progress. Unblocks selector discovery workflow. |
| 9 | 2–3 more challenges for Bramble & Co. | Closes Layer 1 content gap. |
| 10 | Execution-model decision (§3) + implement chosen path | Blocks hosted deploy. |
| 11 | Manifest-lint script | Protects grading ground truth when site redesigns land. |
| 12 | Vercel deploy + BYOK grade route rate limiting | Makes it shareable. |
| 13 | Progress persistence (localStorage baseline) | Player retention. |
| 14 | Snippet autocomplete + lazy-load full Playwright types | Autocomplete polish. |

Layer 2 (ghost replay, hints, helper-assistant chat, tutorial world) stays out
of scope until Layer 1 ships and is playable end-to-end by at least one person
other than the author.
