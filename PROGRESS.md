# PlaywrightQuest — Progress & Feature Inventory

## What the App Is

PlaywrightQuest is a browser-based game for learning Playwright end-to-end testing. Players write real Playwright tests inside an in-browser IDE against a purpose-built fictitious e-commerce site called **Bramble & Co.** An AI agent grades each submission not just on whether the test passes, but on *how well it was written* — selector quality, assertion patterns, async correctness, and BDD coverage.

The core loop:
1. Read the challenge brief and BDD acceptance criteria
2. Write a Playwright test in the Monaco editor
3. Hit "Run & Grade" — the test executes server-side against the real site
4. The AI grades the submission and returns a score breakdown, line-level comments, and failure archaeology
5. Iterate until the test is both passing and well-written

---

## Features Built

### Bramble & Co. — Target Site
- Static e-commerce site at `/sites/bramble-co/` with product grid, cart, and checkout flow
- Intentional DOM traps baked in: dynamic class names, a missing form label, a button that changes text on click (`Submit` → `Processing...`)
- Served locally via Next.js catch-all route at `/sites/bramble-co/`

### DOM Manifest
- `sites/bramble-co/manifest.json` — ground truth for every interactive element
- Each entry records: ideal locator, acceptable locators, brittle locators, ARIA notes, intentional traps, difficulty, and challenge hooks
- The grading engine consumes the manifest, not the live HTML — this makes scoring precise rather than approximate

### Monaco IDE
- TypeScript mode with full Playwright type definitions loaded (`@playwright/test`)
- Custom autocomplete provider ranks suggestions by best-practice hierarchy: `getByRole` → `getByLabel` → `getByText` → `getByPlaceholder` → `getByTestId` → CSS
- `expect(` completions surface web-first assertions (`toBeVisible`, `toHaveText`, etc.) first
- Split-panel layout: editor on the left, output/feedback tabs in a collapsible bottom panel
- Clicking a line comment in the feedback panel jumps the editor cursor to that line

### Challenge Panel
- Displayed in a right sidebar alongside the editor
- Shows: challenge title, difficulty badge (beginner / intermediate / advanced), XP reward, client brief (narrative framing), numbered BDD acceptance criteria, suggested Playwright APIs, and a link to the target site

### Challenge System
- JSON challenge format at `challenges/` with: BDD criteria, manifest element references, suggested APIs, XP reward, hint penalty
- Challenge loader resolves manifest element ids to full manifest entries at grading time
- IDE page accepts a `?challenge=` query parameter to load any challenge; defaults to the first one

### Test Execution Sandbox
- `/api/execute` POST endpoint receives test code as a string
- Writes to a temp file, runs `npx playwright test` against the local Bramble & Co. static site
- Returns: `passed`, `exitCode`, `durationMs`, `stdout`, `stderr`, `errorMessage`, `screenshotBase64` (on failure)
- Docker runner interface stubbed for future deployment isolation

### AI Grading Engine
- `/api/grade` POST endpoint — bring-your-own-key, no server-side API key required
- **Three provider adapters:** Anthropic (`claude-sonnet-4-6`), OpenAI (`gpt-4o-2024-08-06`), Gemini (`gemini-2.0-flash`)
- **Prompt caching** — context assembled in three tiers:
  - *Authoritative block* (grader instructions + all Playwright docs + rubric rules) — cached across every request
  - *Site block* (DOM manifest slice + site-specific challenge notes) — cached per site
  - *Dynamic block* (challenge brief + player code + execution result + retrieved corpus) — per request
  - Anthropic adapter sets explicit `cache_control: ephemeral` on the first two blocks; OpenAI caches prefixes automatically; Gemini uses stable `systemInstruction`
- Returns a `GradingResult` with: score (0–100), pass/fail, score breakdown, line comments, failure archaeology, best practice notes, XP awarded

### Feedback Panel
- Score ring (color-coded: emerald ≥90, blue ≥70, amber ≥40, rose <40)
- Pass/fail verdict badge
- Score breakdown bars for: selector quality, assertion quality, AC coverage, code quality
- Line comments (error / warning / suggestion / praise) — each is clickable and jumps the editor to that line
- Failure archaeology section (only shown on test failure — explains *why* the test failed)
- Best practice notes list
- Provider, model, timing, and cached token count shown in the header

### Playwright Corpus
Editable knowledge base at `corpus/` — the grading engine's source of truth:
- `corpus/grader-instructions.md` — the AI system prompt; edit to sharpen grading stance
- `corpus/playwright-docs/` — locators, best-practices, assertions, Page API, Locator API
- `corpus/rubric-rules/` — selector hierarchy, async patterns, assertion patterns, test structure
- `corpus/challenge-notes/` — per-site gotchas (Bramble & Co. checkout, product grid)

### Keyword-Based Corpus Retrieval
- At grading time, relevant corpus chunks are retrieved by matching challenge tags and error keywords to corpus filenames
- Top 8 chunks are included in the dynamic context block
- Designed to be swapped for pgvector embedding search when the corpus grows

### Provider Settings Dialog
- In-browser UI to set provider (Anthropic / OpenAI / Gemini), API key, and optional model override
- Keys are stored in `localStorage` and passed per-request — never persisted or logged server-side
- If no key is configured, clicking "Run & Grade" opens the settings dialog automatically

---

## What's Not Built Yet (Layer 2+)

- Hint system (3 hints per challenge, XP penalty, AI-generated from manifest)
- Ghost test replay (ideal solution running alongside player's in headed mode)
- Locator Lens (highlight element in DOM panel, show resilience score)
- Helper function assistant (side panel tutor chat)
- Robot instructor character
- Tutorial world
- XP / currency / cosmetic unlocks
- Session persistence and player accounts
- Second and third fictitious sites
