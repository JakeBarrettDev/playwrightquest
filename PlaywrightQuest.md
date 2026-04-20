# PlaywrightQuest — Product & Architecture Brief
> Working title. Replace when a better name surfaces.
> Authored collaboratively via Claude Chat. Hand this document to Claude Code to begin scaffolding.

---

## 1. What This Is

PlaywrightQuest is a browser-based game for learning Playwright end-to-end testing. Players write real Playwright tests inside an in-browser IDE against purpose-built fictitious websites. An AI agent grades their tests not just on whether they pass, but on *how well* they were written — selector quality, resilience, best-practice alignment — and gives feedback in real time.

The target user is someone who has been introduced to Playwright but doesn't yet have a team or codebase to practice against. The game provides the target, the rubric, the feedback loop, and the motivation layer that currently doesn't exist in the Playwright ecosystem.

**The core loop:**
```
Challenge briefing → Read BDD acceptance criteria → Write test in IDE
→ Execute test → AI grades quality + correctness → Feedback + score → Next challenge
```

---

## 2. Guiding Principles

- **Best practices are the game mechanic.** Passing a test is table stakes. Writing it well is what earns points. A test that finds a button by `#dynamic-id-7f3k` should score lower than one using `getByRole('button', { name: 'Submit' })` even if both pass.
- **The DOM is a puzzle, not just a target.** Fictitious sites are designed with intentional traps — missing labels, dynamic class names, inconsistent ARIA — so players learn to navigate real-world messiness.
- **Failure is instructive, not punishing.** Every failed test produces archaeology, not just an error message.
- **The knowledge base is a living artifact.** The AI grading corpus starts from the official Playwright docs and grows as the project matures. It is designed to be edited and extended, not frozen.
- **Server-side AI, zero friction for players.** Players need no Anthropic account. The API key lives as a backend environment variable. The AI is just part of the game.
- **Scope discipline.** Features are tiered. Layer 1 ships before Layer 2 is touched. See Section 9.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Player Browser                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Monaco IDE │  │  Challenge   │  │  Feedback  │  │
│  │  (Playwright│  │  Panel (BDD  │  │  Panel     │  │
│  │  autocomplete│  │  criteria)  │  │  + Score   │  │
│  └──────┬──────┘  └──────────────┘  └────────────┘  │
└─────────┼───────────────────────────────────────────┘
          │ test code + execution request
          ▼
┌─────────────────────────────────────────────────────┐
│                    App Server                        │
│  ┌──────────────────┐   ┌───────────────────────┐   │
│  │  Test Execution  │   │  AI Grading Engine    │   │
│  │  Sandbox         │   │  (Context Assembler   │   │
│  │  (Docker/queue)  │   │  + Claude API caller) │   │
│  └──────────────────┘   └───────────────────────┘   │
│  ┌──────────────────┐   ┌───────────────────────┐   │
│  │  DOM Library     │   │  Playwright Corpus    │   │
│  │  (static assets  │   │  (chunked docs +      │   │
│  │  + DOM manifests)│   │  rubric rules JSON)   │   │
│  └──────────────────┘   └───────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Tech stack recommendation:**
- Frontend: React + Monaco Editor
- Backend: Node.js / Express (or Next.js API routes)
- Test runner: Playwright running in Docker containers, one per session
- AI agent: Anthropic Claude API (claude-sonnet, server-side, key in env)
- DOM library: Static JSON/HTML assets committed to repo
- Corpus: JSON files + optional pgvector for RAG at scale

---

## 4. The DOM Library

### Philosophy
Fictitious websites built and owned by this project. Not live-crawled. DOM structures are inspired by real-world site archetypes but are static, versioned assets. The project controls the ground truth entirely.

### How Sites Are Created
1. Use Crawlee to snapshot real sites for structural inspiration (run offline, one-time, by project contributors)
2. Human reviews snapshot, strips identifying content, redesigns as a fictitious site
3. Site HTML is committed as a static asset
4. A **DOM manifest** is authored alongside it (see Section 4.3)
5. The manifest is the rubric — the AI agent consumes it, not the live HTML

### Site Library (v1 — one site ships first)
| Site | Archetype | Complexity | Notes |
|------|-----------|------------|-------|
| **Bramble & Co.** | E-commerce storefront | Beginner–Intermediate | Product grid, filters, cart, checkout flow |
| *(future)* Static marketing site | Pure HTML, minimal JS | Tutorial only | Forms, nav, basic assertions |
| *(future)* CMS/SPA hybrid | Drupal/Vue-style | Advanced | Dynamic classes, inconsistent ARIA, mixed rendering |

**Ship Bramble & Co. first.** It has enough surface area to cover the core Playwright API without overwhelming new players.

### DOM Manifest Schema
Every interactive element in a fictitious site has a manifest entry. This is what makes the AI grading engine precise rather than approximate.

```json
{
  "site": "bramble-co",
  "version": "1.0.0",
  "elements": [
    {
      "id": "checkout-submit",
      "description": "Final purchase submission button in checkout flow",
      "ideal_locator": "getByRole('button', { name: 'Complete Purchase' })",
      "acceptable_locators": [
        "getByTestId('checkout-submit')"
      ],
      "brittle_locators": [
        "#btn-checkout-7f3k",
        ".checkout-cta-dynamic",
        "nth(2)"
      ],
      "aria_notes": "Button text changes to 'Processing...' on click. Tests must account for state transition.",
      "intentional_traps": ["dynamic_class", "state_change"],
      "challenge_hooks": ["form_submission", "network_intercept", "assertion_on_redirect"],
      "difficulty": "intermediate"
    }
  ]
}
```

**The manifest is a first-class product artifact.** It should be authored carefully and reviewed like code. It is the source of truth for every grading decision.

---

## 5. The AI Grading Engine

### Architecture
The grading engine is a server-side Claude API call. It is NOT a fine-tuned model. It is a context-engineered Claude instance that receives a carefully assembled context package at runtime.

### Context Package (assembled per grading request)
```typescript
interface GradingContextPackage {
  // What the player is working on
  challenge: {
    site: string;                    // e.g. "bramble-co"
    challengeId: string;
    acceptanceCriteria: string[];    // BDD Given/When/Then statements
    difficulty: string;
  };

  // Ground truth for this challenge's elements
  domManifest: DOMManifestEntry[];   // Relevant entries from manifest JSON

  // What the player wrote and what happened
  playerTest: {
    code: string;                    // Full test file content
    executionResult: {
      passed: boolean;
      errorMessage?: string;
      errorStack?: string;
      screenshotBase64?: string;     // On failure
    };
  };

  // Scoring instructions
  rubric: RubricConfig;              // See Section 5.3

  // Relevant Playwright knowledge
  corpusChunks: string[];            // RAG-retrieved relevant doc sections
}
```

### System Prompt (base, edit to sharpen over time)
```
You are the PlaywrightQuest grading engine and instructor. You are an expert in 
Playwright end-to-end testing best practices. You evaluate player-submitted tests 
against acceptance criteria and DOM manifests, grading not just correctness but quality.

You are opinionated:
- getByRole, getByLabel, getByText, getByPlaceholder > getByTestId > CSS selectors > XPath > IDs
- Web-first assertions (toBeVisible, toHaveText) are always preferred over manual waits
- Chaining off Promise-returning methods without await is always a bug
- Tests should be atomic and independent
- Page Object Model patterns score higher on complex flows

You provide feedback that is specific, educational, and kind. You reference the exact 
line of the player's code when pointing out issues. You explain *why* a practice is 
better, not just *that* it is.

You always respond in the GradingResult JSON schema provided.
```

### Rubric Config (v1)
```json
{
  "categories": {
    "selector_quality": {
      "weight": 0.35,
      "scoring": {
        "ideal_locator_used": 1.0,
        "acceptable_locator_used": 0.7,
        "brittle_locator_used": 0.2,
        "brittle_locator_that_also_fails": 0.0
      }
    },
    "assertion_quality": {
      "weight": 0.25,
      "scoring": {
        "web_first_assertion": 1.0,
        "manual_wait_with_assertion": 0.5,
        "no_assertion": 0.0
      }
    },
    "acceptance_criteria_coverage": {
      "weight": 0.25,
      "scoring": "percentage of BDD criteria covered by at least one test step"
    },
    "code_quality": {
      "weight": 0.15,
      "scoring": {
        "proper_async_await": "required — missing await is automatic deduction",
        "descriptive_test_name": "bonus points",
        "pom_pattern_on_complex_flow": "bonus points"
      }
    }
  }
}
```

### Grading Response Schema
```typescript
interface GradingResult {
  passed: boolean;
  score: number;                     // 0–100
  breakdown: {
    selector_quality: number;
    assertion_quality: number;
    acceptance_criteria_coverage: number;
    code_quality: number;
  };
  feedback: {
    summary: string;                 // 2–3 sentence overall
    lineComments: LineComment[];     // Specific line-level notes
    failureArchaeology?: string;     // Only on test failure — explains why
    bestPracticeNotes: string[];     // Educational callouts
  };
  hintsUsed: number;                 // Affects score multiplier
  xpAwarded: number;
}

interface LineComment {
  line: number;
  type: "error" | "warning" | "suggestion" | "praise";
  message: string;
}
```

---

## 6. The Playwright Corpus

### What It Is
A curated, chunked knowledge base of Playwright best practices. The grading engine retrieves relevant chunks via RAG (or keyword matching at v1) and includes them in the context package.

### Sources (in priority order)
1. **playwright.dev official docs** — especially: Locators guide, Best Practices page, Assertions reference, API Reference for `Page`, `Locator`, `expect`
2. **Rubric rules** — hand-authored opinionated rules (e.g. "never use `page.waitForTimeout` in production tests")
3. **Challenge-specific notes** — authored per DOM manifest, e.g. notes about a particular element's behavior

### Corpus Structure
```
/corpus
  /playwright-docs
    locators.md
    best-practices.md
    assertions.md
    api-page.md
    api-locator.md
    ...
  /rubric-rules
    selector-hierarchy.md
    async-patterns.md
    assertion-patterns.md
    test-structure.md
  /challenge-notes
    bramble-co-checkout.md
    bramble-co-product-grid.md
    ...
```

### RAG Strategy (v1: simple keyword matching)
At v1, retrieve corpus chunks by matching challenge tags and error keywords to filenames. Replace with pgvector embedding search when corpus grows beyond ~20 files.

### Corpus is Editable
This is intentional. As the project maintainer learns more from real Playwright work, new rules and notes are added. The corpus is a product artifact, not a dependency. Store it in the repo, treat it like docs, PR-review changes to it.

---

## 7. The In-Browser IDE

### Editor
Monaco Editor (same engine as VS Code). Configured for TypeScript.

### Playwright-Specific Autocomplete
- Seed Monaco with Playwright TypeScript type definitions
- Custom completion provider for common Playwright patterns:
  - `page.` → suggest `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, `getByTestId`
  - `expect(` → suggest `toBeVisible`, `toHaveText`, `toHaveValue`, `toBeEnabled`
  - `await test.step(` → scaffold a step block
- Autocomplete suggestions are ranked by best-practice hierarchy (getByRole first)

### View Modes
Toggle between three modes via button group in the toolbar:
| Mode | Description |
|------|-------------|
| **Terminal only** | Raw test output, no browser window |
| **Headed** | Browser window visible alongside IDE |
| **Debug** | Playwright inspector, step-through, pause on failure |

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  [Challenge Title]         [Hint] [Run Test] [Mode: ▼]  │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│   Monaco Editor          │   Browser / Terminal / Debug │
│   (TypeScript,           │   output panel               │
│   Playwright types)      │                              │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│  Feedback Panel (AI grading result, line comments, XP)  │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Challenge Structure

### Challenge Format
Each challenge is a JSON file referencing a site, a set of DOM manifest elements, BDD criteria, and metadata.

```json
{
  "id": "bramble-checkout-happy-path",
  "title": "Checkout: Happy Path",
  "site": "bramble-co",
  "difficulty": "intermediate",
  "clientBrief": "Bramble & Co. is deploying a new checkout flow next Friday. They need automated regression coverage for a complete guest purchase before the deploy window. You are the QA Automation Engineer on this account.",
  "acceptanceCriteria": [
    "Given a guest user has items in their cart, when they proceed to checkout, then the checkout page should be visible",
    "Given a guest user on the checkout page, when they enter valid payment details and submit, then they should see an order confirmation",
    "Given a guest user on the checkout page, when the form is submitted, then the submit button should display 'Processing...' while the request is in flight"
  ],
  "manifestElements": ["checkout-submit", "payment-form", "order-confirmation"],
  "suggestedPlaywrightAPIs": ["getByRole", "getByLabel", "waitForResponse", "toBeVisible", "toHaveText"],
  "xpReward": 150,
  "hintPenalty": 25
}
```

### Hint System
Players can request up to 3 hints per challenge, each deducting from final XP. Hints are generated by the AI agent from the DOM manifest and corpus, not hardcoded. Hint 1 is conceptual, Hint 2 is directional, Hint 3 shows the ideal locator for the stuck element.

### Helper Function Assistant
A side panel chat interface backed by the same grading engine AI, restricted to Playwright questions about the current challenge. It can answer "how do I intercept a network request here?" but will not write the test for the player. Prompt-constrained to be a tutor, not a solution dispenser.

---

## 9. Feature Tiers (Scope Discipline)

### Layer 1 — Core Loop (ship nothing else first)
- [ ] One fictitious site (Bramble & Co.) with DOM manifest
- [ ] Monaco IDE with Playwright TypeScript autocomplete
- [ ] BDD challenge format (start with 3–5 challenges)
- [ ] Server-side test execution sandbox (Docker, one per session)
- [ ] AI grading engine (context assembler + Claude API + GradingResult schema)
- [ ] Failure archaeology in feedback panel
- [ ] Basic XP scoring display

### Layer 2 — Meaningful Differentiation
- [ ] Ghost test replay (ideal solution running alongside player's in headed mode)
- [ ] Locator Lens — highlight element in DOM panel, show resilience score, CSS mutation re-run
- [ ] Robot instructor with text bubbles (character delivers challenge brief + reacts to results)
- [ ] Hint system (3 hints, XP penalty, AI-generated from manifest)
- [ ] Helper function assistant (side panel tutor chat)
- [ ] Tutorial world (Playwright worker model, auto-wait explainer, selector hierarchy lesson)
- [ ] Multiple difficulty tiers within Bramble & Co.

### Layer 3 — Retention & Personality
- [ ] XP → currency system
- [ ] Cosmetic unlocks: IDE color schemes, instructor character skins, sound effects
- [ ] Built-in wiki / Playwright docs reference page
- [ ] Second fictitious site (static marketing site, tutorial difficulty)
- [ ] Third fictitious site (CMS/SPA hybrid, expert difficulty)
- [ ] Challenge leaderboard (optional, shared storage)
- [ ] Session persistence (player progress saved)

---

## 10. Test Execution Sandbox

### The Hard Problem
Running player Playwright tests server-side requires isolated execution environments. This is the highest infrastructure complexity item in the project.

### Recommended Approach (v1)
- Each test execution spins a Docker container with Playwright pre-installed
- Container receives the player's test file and the site's static HTML
- Container runs `npx playwright test` and returns stdout + exit code + optional screenshot
- Container is destroyed after execution
- Job queue (Bull/BullMQ) manages concurrent requests with a concurrency cap

### Local-First Development
During development, test execution can run locally (no Docker) to keep the dev loop fast. Add Docker abstraction layer before any public deployment.

### Security Constraints
Player code runs in a sandboxed container. The container must:
- Have no network access to anything outside the fictitious site assets
- Have no filesystem access to host
- Have a hard execution timeout (default: 30 seconds)
- Not be able to spawn child processes outside Playwright

---

## 11. Feeding the AI Agent — Operational Notes

### Adding New Rubric Knowledge
Edit files in `/corpus/rubric-rules/`. Each file is Markdown. The grading engine system prompt instructs Claude to treat these as authoritative. Add a new `.md` file, describe the pattern, give a good and bad example. No code deploy required if corpus is hot-loaded.

### Adding Real-World DOM Patterns
When a real site structure inspires a new challenge design:
1. Run Crawlee snapshot (offline, contributor-only tool)
2. Review snapshot, extract structural patterns of interest
3. Build those patterns into the next fictitious site or add elements to an existing one
4. Author manifest entries for new elements
5. Commit to repo — the AI agent picks it up automatically

### Sharpening the Agent Over Time
The grading agent improves through two levers:
1. **System prompt edits** — add opinionated rules as you encounter real-world patterns from your own Playwright work
2. **Corpus additions** — add new rubric rule files, new challenge notes, richer manifest entries

Both are editorial tasks, not engineering tasks. They can be done in a chat session with Claude and committed as Markdown files.

---

## 12. Project Structure (Recommended)

```
playwrightquest/
├── app/
│   ├── frontend/          # React app
│   │   ├── components/
│   │   │   ├── IDE/       # Monaco editor + toolbar
│   │   │   ├── Challenge/ # BDD panel, client brief
│   │   │   ├── Feedback/  # Grading results, line comments
│   │   │   └── Instructor/# Robot character, text bubbles (Layer 2)
│   │   └── pages/
│   ├── backend/           # Node/Express server
│   │   ├── routes/
│   │   │   ├── execute.ts # Test execution endpoint
│   │   │   └── grade.ts   # AI grading endpoint
│   │   ├── grading/
│   │   │   ├── contextAssembler.ts
│   │   │   ├── claudeClient.ts
│   │   │   └── rubric.ts
│   │   └── execution/
│   │       ├── sandbox.ts # Docker orchestration
│   │       └── queue.ts   # BullMQ job queue
├── sites/
│   └── bramble-co/
│       ├── index.html     # Static site HTML
│       ├── manifest.json  # DOM manifest (source of truth)
│       └── assets/
├── challenges/
│   ├── bramble-checkout-happy-path.json
│   └── ...
├── corpus/
│   ├── playwright-docs/
│   ├── rubric-rules/
│   └── challenge-notes/
└── tools/
    └── crawlee-snapshot/  # Offline DOM capture tool (contributor use only)
```

---

## 13. Open Questions (Decide Before Building)

1. **Framework:** Pure React + Express, or Next.js? Next.js API routes simplify deployment but add framework overhead. Recommendation: Next.js if targeting Vercel deployment; Express if self-hosting.

2. **Test execution:** Local-only at v1 (simplest), or Docker from day one? Recommendation: Abstract the execution layer early even if the first implementation is local. Swap in Docker when deploying.

3. **Corpus retrieval at v1:** Keyword matching or full RAG? Recommendation: keyword matching is fine for 10–20 corpus files. Add pgvector when corpus grows or when grading quality plateaus.

4. **Player accounts:** Session-only at v1 (no login, no persistence), or auth from the start? Recommendation: session-only. Add auth in Layer 3 alongside progress persistence.

5. **Name:** PlaywrightQuest is a placeholder. Pick something before public launch.

---

## 14. First Sprint Directive (for Claude Code)

Build in this order:

1. **Static Bramble & Co. site** — a believable e-commerce HTML/CSS site with a product page, cart, and checkout flow. No backend required. Intentional DOM traps baked in (dynamic classes, one missing label, one element that changes text on interaction).

2. **DOM manifest for Bramble & Co.** — author manifest.json covering at least 10 interactive elements using the schema in Section 4.3.

3. **Monaco IDE component** — TypeScript mode, Playwright type definitions loaded, custom autocomplete provider with getByRole/getByLabel/etc. ranked first.

4. **Execution sandbox (local)** — endpoint that receives test code as a string, writes it to a temp file, runs `npx playwright test` against the local Bramble & Co. static site, returns stdout + exit code.

5. **Context assembler + Claude API grading call** — assemble the GradingContextPackage, call Claude API, parse GradingResult response.

6. **Feedback panel** — display score breakdown, line comments, failure archaeology. No styling required yet — data first.

7. **Wire it together** — one challenge, end-to-end, playable.

Everything else is Layer 2.
