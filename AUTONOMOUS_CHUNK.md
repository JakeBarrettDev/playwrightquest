# Autonomous Build Chunk — Production Deployment + Content Expansion

## Context for Opus

This document was prepared by a prior Claude session that has reviewed the full codebase.
You have full autonomy to implement everything in this spec in priority order. Every design
decision has been made — do not ask for approval mid-build. Stop at the explicit boundary
at the end of this document.

**Read these files before writing any code:**
- `AGENTS.md` — Next.js version notes
- `lib/execution/localRunner.ts` — understand the current local runner before modifying it
- `lib/execution/dockerRunner.ts` — the reference implementation for trace/video recording
- `lib/trace/types.ts` — TraceStep shape (videoTimestampMs is required)
- `playwright.config.ts` — the current project-level config

---

## Priority 1 — LocalRunner production trace support

**Why:** The deployment model for Railway uses `EXECUTION_RUNNER=local` inside a container
built on the Playwright Docker image. The LocalRunner currently does not record traces or
video, so the TracePlayer will not work in production. This is the highest-priority fix.

**File: `lib/execution/localRunner.ts`**

The LocalRunner needs to:
1. Generate a `runId` (`randomUUID().replace(/-/g, "")`) per run
2. Write a custom `playwright.config.js` to the run directory (same pattern as DockerRunner)
   with `trace: 'on'` and `video: 'on'` — do NOT use the project's `playwright.config.ts`
3. After the test exits, copy `trace.zip` and `video.webm` to
   `.sandbox/traces/<runId>/` before cleaning up the run directory
4. Return `runId` in `ExecutionResult` (field already exists on the type)
5. Import and reuse the `cleanupOldTraces` logic from DockerRunner — extract it to
   `lib/execution/cleanup.ts` so both runners share it

The custom config written by LocalRunner should be identical in shape to what DockerRunner
writes. Reuse `buildPlaywrightConfig` — extract it to `lib/execution/config.ts` so both
runners share it. Pass `headless: true` always for LocalRunner (no headed mode in local).

**File: `lib/execution/config.ts`** (new — shared config builder)

Move `buildPlaywrightConfig` from `dockerRunner.ts` into this file. Both runners import
from here. Signature:

```typescript
export function buildPlaywrightConfig(opts: {
  baseUrl: string;
  browserName: string;
  headless: boolean;
}): string
```

Video is always `'on'`. Trace is always `'on'`. These are not configurable.

**File: `lib/execution/cleanup.ts`** (new — shared cleanup)

Move `cleanupOldTraces` from `dockerRunner.ts` into this file. Both runners import it.

---

## Priority 2 — Dockerfile and Railway deployment config

**File: `Dockerfile`** (new, in project root)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Runtime environment
ENV NODE_ENV=production
ENV EXECUTION_RUNNER=local
ENV PORT=3000

# Ensure the sandbox directory exists and is writable
RUN mkdir -p /app/.sandbox/traces

EXPOSE 3000
CMD ["npm", "start"]
```

**File: `.dockerignore`** (new)

```
node_modules
.next
.sandbox
*.md
.git
.gitignore
```

**File: `railway.json`** (new, in project root)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**File: `.env.production.example`** (new)

```bash
# Required: set this to your Railway public domain after first deploy
PQ_BASE_URL=https://your-app.railway.app

# Execution runner — always local in production (Playwright is in the container)
EXECUTION_RUNNER=local

# Optional: AI provider settings are client-side (BYOK) — no server env needed
```

**Note on `.sandbox/traces` persistence:** Railway volumes are optional. Given that traces
are cleaned up after 30 minutes and are only needed within a single session, an in-container
ephemeral `.sandbox` is acceptable. If Railway restarts the container, in-flight traces are
lost, but this is an acceptable edge case for a learning game. Do NOT add a Railway volume
— it adds complexity and cost for minimal benefit.

---

## Priority 3 — Second fictitious website: Thornfield & Associates

A professional services / consulting firm website. Different domain, different interaction
patterns from Bramble & Co. (e-commerce). This forces players to use Playwright against
form-heavy, navigation-heavy pages rather than a shop.

### Site structure

**File: `sites/thornfield/index.html`**

A consulting firm homepage with:
- Navigation: Home, Services, Team, Contact (links to respective pages)
- Hero section with a "Get in touch" CTA button (links to contact.html)
- Services section: three service cards (Strategy, Technology, Operations)
  each with a "Learn more" link (`/sites/thornfield/services.html#strategy` etc.)
- Testimonials section with three client quotes (role="blockquote" or similar)
- Footer with contact info

**File: `sites/thornfield/contact.html`**

Contact form page:
- `<label>` for every field — no missing-label traps (different from Bramble)
- Fields: Full name, Work email, Company, Phone (optional), 
  Service interest (select/combobox with options: Strategy, Technology, Operations, Other),
  Message (textarea)
- Submit button: "Send message"
- On submit: hide the form, show a confirmation `<div role="alert">` with text
  "Thank you, we'll be in touch within one business day."
- **Intentional trap:** the Phone field has `type="tel"` and no `required` attribute.
  Players who assert on it without checking whether it's filled may get false positives.
- **Intentional trap:** the Service interest `<select>` has an empty first option
  ("Select a service…") — players who don't explicitly select an option and then assert
  `toHaveValue` will get the empty string.

**File: `sites/thornfield/services.html`**

Services detail page:
- Three sections with `id="strategy"`, `id="technology"`, `id="operations"`
- Each has a heading, description paragraph, and "Request a consultation" button
- The buttons open a modal dialog (`role="dialog"`, `aria-modal="true"`) with a
  simplified version of the contact form (Name + Email + a hidden Service field pre-filled)
- **Intentional trap:** the modal has `aria-labelledby` pointing to the dialog heading.
  Players who try to locate the modal by text inside it rather than by role/name will
  struggle.

**File: `sites/thornfield/manifest.json`**

Follow the exact same structure as `sites/bramble-co/manifest.json`. Every interactive
element needs:
- `id`, `element_type`, `page`
- `ideal_locator`, `acceptable_locators`, `brittle_locators`
- `intentional_traps` array
- `challenge_hooks` tags
- `difficulty`

Key elements to manifest:
- Nav links (getByRole link + name)
- CTA button on homepage
- All contact form fields
- Submit button
- Confirmation alert
- Service select (combobox)
- Modal dialog and its close button
- "Request a consultation" buttons on services page

---

## Priority 4 — New challenges

### Challenge A: Bramble & Co. — Product Grid Filter

**File: `challenges/bramble-product-grid-filter.json`**

The challenge notes for this already exist in `corpus/challenge-notes/bramble-co-product-grid.md`.
Write the challenge JSON to match.

```json
{
  "id": "bramble-product-grid-filter",
  "title": "Filter the Product Grid",
  "site": "bramble-co",
  "difficulty": "beginner",
  "clientBrief": "QA has asked you to verify the category filter on the Bramble & Co. shop page. When a customer checks the 'Planters' filter, only planter products should be visible. Verify this works correctly.",
  "acceptanceCriteria": [
    "Given I am on the Bramble & Co. shop page",
    "When I check the 'Planters' category filter",
    "Then only products in the Planters category should be visible",
    "And products in other categories should be hidden"
  ],
  "manifestElements": ["category-filter-planters", "product-grid", "product-card"],
  "tags": ["filter", "checkbox", "visibility", "dynamic_class", "getByLabel"],
  "suggestedPlaywrightAPIs": [
    "page.getByLabel()",
    "locator.check()",
    "expect(locator).toBeVisible()",
    "expect(locator).toBeHidden()",
    "expect(locator).toHaveCount()"
  ],
  "startingCode": "import { test, expect } from '@playwright/test';\n\ntest('product grid filters by category', async ({ page }) => {\n  await page.goto('/');\n  \n  // Check the Planters filter\n  \n  // Assert that only planter products are visible\n  \n  // Assert that non-planter products are hidden\n});\n",
  "xpReward": 100,
  "hintPenalty": 10
}
```

Adjust `manifestElements` to match actual IDs in `sites/bramble-co/manifest.json`. If the
manifest is missing elements needed for this challenge, add them.

### Challenge B: Thornfield — Contact Form Submission

**File: `challenges/thornfield-contact-form.json`**

```json
{
  "id": "thornfield-contact-form",
  "title": "Submit the Contact Form",
  "site": "thornfield",
  "difficulty": "beginner",
  "clientBrief": "Thornfield & Associates need automated tests for their contact form. A prospective client should be able to fill in their details, select a service, and submit the form — and see a confirmation message.",
  "acceptanceCriteria": [
    "Given I am on the Thornfield contact page",
    "When I fill in all required fields with valid data",
    "And I select a service from the dropdown",
    "And I click the Send message button",
    "Then a confirmation message should be visible"
  ],
  "manifestElements": [],
  "tags": ["form", "select", "combobox", "confirmation", "getByLabel", "getByRole"],
  "suggestedPlaywrightAPIs": [
    "page.getByLabel()",
    "page.getByRole()",
    "locator.fill()",
    "locator.selectOption()",
    "locator.click()",
    "expect(locator).toBeVisible()"
  ],
  "startingCode": "import { test, expect } from '@playwright/test';\n\ntest('contact form submission shows confirmation', async ({ page }) => {\n  await page.goto('/sites/thornfield/contact.html');\n  \n  // Fill in the required fields\n  \n  // Select a service\n  \n  // Submit the form\n  \n  // Assert the confirmation is visible\n});\n",
  "xpReward": 120,
  "hintPenalty": 10
}
```

Fill `manifestElements` with the actual IDs from the manifest you create.

### Challenge C: Thornfield — Services Modal

**File: `challenges/thornfield-services-modal.json`**

```json
{
  "id": "thornfield-services-modal",
  "title": "Open and Submit a Service Modal",
  "site": "thornfield",
  "difficulty": "intermediate",
  "clientBrief": "The services page has consultation request modals. Test that clicking 'Request a consultation' on the Technology service opens the correct modal and allows submission.",
  "acceptanceCriteria": [
    "Given I am on the Thornfield services page",
    "When I click the Request a consultation button for the Technology service",
    "Then a dialog should open",
    "When I fill in my name and email",
    "And I submit the dialog form",
    "Then the confirmation message should be visible"
  ],
  "manifestElements": [],
  "tags": ["modal", "dialog", "aria-modal", "getByRole", "intermediate"],
  "suggestedPlaywrightAPIs": [
    "page.getByRole('dialog')",
    "locator.getByRole()",
    "expect(locator).toBeVisible()",
    "page.getByRole('button', { name })"
  ],
  "startingCode": "import { test, expect } from '@playwright/test';\n\ntest('technology service modal can be submitted', async ({ page }) => {\n  await page.goto('/sites/thornfield/services.html');\n  \n  // Open the Technology consultation modal\n  \n  // Assert the dialog is open\n  \n  // Fill in the form inside the dialog\n  \n  // Submit and verify confirmation\n});\n",
  "xpReward": 150,
  "hintPenalty": 15
}
```

---

## Priority 5 — Corpus: Thornfield challenge notes

**File: `corpus/challenge-notes/thornfield-contact.md`**

Document the intentional traps for the Thornfield contact form challenge:
- The optional Phone field (no `required`, don't assert on it)
- The Service select empty first option trap
- All accessible names for every field (the reference table that bramble-co-checkout.md has)

**File: `corpus/challenge-notes/thornfield-modal.md`**

Document the modal/dialog traps:
- How to locate a `role="dialog"` by name
- Why scoping locators inside the dialog is important (`dialog.getByRole(...)`)
- The `aria-labelledby` pattern and how it affects accessible names

---

## Priority 6 — Home page: show all challenges

The home page currently only shows one challenge. Update it to load and display all
challenges from the `challenges/` directory, grouped by site. Each challenge card should
show: title, site, difficulty badge, XP reward. Clicking navigates to the IDE with that
challenge loaded.

Read `app/page.tsx` and `lib/challenges/loader.ts` before making changes.
Do not redesign the UI — extend the existing pattern.

---

## Priority 7 — Hint system UI (if context allows)

The grading schema already has `hintsUsed` and `hintPenalty`. The infrastructure is there.
What's missing is a UI for requesting hints.

Add a "Hint" button to the IDE toolbar. Each click:
1. Increments a `hintsUsed` counter in component state
2. Calls `POST /api/hint` (new route) with `challengeId`, `playerCode`, `hintsUsed`
3. The route assembles a minimal context package (challenge + player code, no execution
   result) and asks the AI for one specific, non-spoiling hint
4. Displays the hint in a dismissable panel above the editor
5. Shows a small "-Xp" indicator next to the XP display for each hint used

The hint prompt should be added to `corpus/grader-instructions.md` in a new section:

```
## Hint generation

When asked for a hint (rather than a full grade), return a single paragraph of 2–3
sentences maximum. The hint should:
- Point the player toward the right API or concept without revealing the exact solution
- Reference a specific doc section they should read
- Never write the code for them

Return plain text, not JSON.
```

The `/api/hint` route returns `{ hint: string }`. It uses the same provider/apiKey from
the request body as the grade route.

---

## What NOT to build in this chunk

Do not build any of the following — they are out of scope:
- User accounts or authentication
- Leaderboard
- Progress persistence beyond what localStorage already provides
- Ghost test replay
- Additional browser support (Firefox/WebKit UI)
- Any changes to the grading pipeline, trace player, terminal, or Docker runner

---

## Acceptance criteria for the full chunk

- [ ] `EXECUTION_RUNNER=local` produces traces and video, TracePlayer works in local mode
- [ ] `docker build .` succeeds and the resulting container runs the app correctly
- [ ] `railway.json` is present and valid
- [ ] Thornfield & Associates site is accessible at `/sites/thornfield/`
- [ ] All three Thornfield pages render correctly with the documented intentional traps
- [ ] `sites/thornfield/manifest.json` covers all interactive elements
- [ ] All four new challenges appear on the home page
- [ ] Each new challenge can be selected and loads in the IDE with correct starting code
- [ ] Bramble grid filter challenge is playable end-to-end
- [ ] Thornfield contact form challenge is playable end-to-end
- [ ] Thornfield modal challenge is playable end-to-end
- [ ] Corpus challenge-notes files exist for both Thornfield challenges
- [ ] Hint button appears in the IDE toolbar and returns a non-spoiling hint
- [ ] No regressions in existing challenge, grading, streaming, or trace player behaviour

---

## Final note to Opus

Work through priorities in order. If you complete all seven and have context remaining,
do a quality pass: run `npm run build` to catch type errors, verify all new JSON files
parse correctly, and check that every manifest element referenced in a challenge JSON
actually exists in the corresponding `manifest.json`.

Do not start anything beyond what is listed here.
