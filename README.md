# PlaywrightQuest

A browser-based game for learning Playwright end-to-end testing. Players write real Playwright tests in an in-browser Monaco IDE against purpose-built fictitious websites, and an LLM grades each submission on correctness **and** quality — selector hierarchy, web-first assertions, async patterns, BDD coverage.

Working title. See [`PlaywrightQuest.md`](./PlaywrightQuest.md) for the full product brief.

## Status

Layer 1 is under construction. Current progress:

- Static Bramble & Co. site at `/sites/bramble-co/`
- DOM manifest (`sites/bramble-co/manifest.json`) — the grading ground truth
- Monaco IDE with Playwright types and ranked autocomplete at `/ide`
- Local Playwright execution sandbox at `/api/execute`
- Corpus + keyword retrieval under `corpus/`
- Multi-provider grading engine at `/api/grade` (Anthropic, OpenAI, Gemini)

Still to land: challenge UI, feedback panel, and the front-to-back wire-together.

## Running

```bash
npm install
npx playwright install chromium   # first time only
npm run dev
```

Visit `http://localhost:3000`. The IDE preview is at `/ide`.

## Grading — bring your own key

PlaywrightQuest **does not ship with an API key**. Players (or self-hosted operators) supply their own for whichever LLM they prefer. Keys are passed in the request body to `/api/grade` and forwarded directly to the provider — they are **never persisted or logged** by the server.

Supported providers:

| Provider  | Default model          | Key source                                |
|-----------|------------------------|-------------------------------------------|
| Anthropic | `claude-sonnet-4-6`    | https://console.anthropic.com/            |
| OpenAI    | `gpt-4o-2024-08-06`    | https://platform.openai.com/              |
| Gemini    | `gemini-2.0-flash`     | https://aistudio.google.com/apikey        |

Each request body looks like:

```jsonc
{
  "provider": "anthropic",          // or "openai" | "gemini"
  "apiKey": "sk-ant-...",
  "model": "claude-sonnet-4-6",     // optional override
  "challengeId": "bramble-checkout-happy-path",
  "playerCode": "import { test, expect } ...",
  "executionResult": { /* the body returned from /api/execute */ },
  "hintsUsed": 0
}
```

### Prompt caching

The context package is structured for prefix caching so that the expensive, stable parts are paid for once:

1. **Authoritative block** — grader instructions + full Playwright docs + rubric rules. Static across every request.
2. **Site block** — DOM manifest slice + site-specific challenge notes. Static per site.
3. **Dynamic block** — challenge brief, player code, execution result, retrieved corpus chunks.

The Anthropic adapter sets explicit `cache_control: ephemeral` on blocks 1 and 2. OpenAI caches prefixes automatically. Gemini uses implicit caching via a stable `systemInstruction`.

## Editing the AI's behavior

The grading engine is a context-engineered LLM — it is **not** fine-tuned. Its judgment is entirely a function of what's in the `corpus/` directory, which is treated as the authoritative source of truth for every grading call:

- [`corpus/grader-instructions.md`](./corpus/grader-instructions.md) — the system prompt. Edit to sharpen the agent's stance.
- [`corpus/playwright-docs/`](./corpus/playwright-docs/) — Playwright documentation chunks. This is the end-all, be-all authority.
- [`corpus/rubric-rules/`](./corpus/rubric-rules/) — opinionated scoring rules.
- [`corpus/challenge-notes/`](./corpus/challenge-notes/) — per-site gotchas surfaced by RAG.

These are Markdown. Edit, commit, reload — no code deploy needed.

## Project layout

```
app/                    # Next.js app router
  api/
    execute/            # POST — runs player Playwright test locally
    grade/              # POST — BYOK grading against any of three providers
  ide/                  # Monaco IDE preview page
challenges/             # Challenge JSONs (BDD criteria + manifest ids)
components/             # React components (IDE wired; Challenge/Feedback TBD)
corpus/                 # Editable, authoritative grading context
lib/
  challenges/           # Challenge loader
  corpus/               # Corpus loader + keyword retrieval
  execution/            # Local sandbox runner
  grading/              # Context assembler + provider adapters
  types/                # Shared TS types
sites/bramble-co/       # First fictitious site + DOM manifest
```
