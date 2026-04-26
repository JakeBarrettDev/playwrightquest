# Trace Player + Tutor Chat + Quasi-Terminal

## Vision

After running a test, the player sees a step-by-step visual replay of their test execution
with the element their locator matched highlighted on screen. The AI tutor's comments
appear as chat bubbles anchored to the relevant step. On failure this opens automatically;
on success it is player-triggered. A quasi-terminal in the IDE accepts real Playwright CLI
commands and routes them to the appropriate execution mode.

---

## Important constraints to read before writing a line of code

### What --ui and --debug actually are

`playwright --ui` and `playwright --debug` are Electron-based desktop GUI apps. They
cannot run inside a Docker container or serve over a network connection. **Do not attempt
to launch them.** The visual replay experience the player needs is achieved by building a
custom trace player from the trace.zip Playwright already generates — this gives us more
control anyway.

### What --headed actually means here

The Playwright Docker image supports headed mode via Xvfb (virtual framebuffer). When
`--headed` is requested, set `headless: false` and `video: 'on'` in the config. The
container records video, which is returned to the client and played back. This is the
web-friendly equivalent of a headed run.

### Trace data is rich enough for locator highlighting

Each action in the trace includes:
- The locator string used
- A bounding box of the matched element
- Before and after page screenshots

We do not need to approximate where a locator landed — it is recorded exactly. Use this
to draw a highlight rectangle over the element on the screenshot.

---

## Architecture overview

```
Player submits test
        │
        ▼
DockerRunner runs with trace: 'on', video: 'on' (if headed)
        │
        ▼
/api/execute streams output lines (existing SSE)
        │
        ▼
On close: trace.zip + video (if any) extracted from test-results
Stored temporarily under .sandbox/traces/<runId>/
        │
        ├── /api/trace/[runId]/actions  → JSON array of trace steps
        ├── /api/trace/[runId]/frame/[index]  → PNG screenshot for step N
        └── /api/trace/[runId]/video  → webm video (if recorded)
        │
        ▼
Grading runs as normal (/api/grade), produces lineComments with line numbers
        │
        ▼
/api/trace/[runId]/annotate  maps lineComments → step indices
        │
        ▼
TracePlayer UI: renders steps + screenshots + highlight boxes + tutor bubbles
```

---

## Part 1 — Trace recording in DockerRunner

**File: `lib/execution/dockerRunner.ts`**

Update `buildPlaywrightConfig` to accept an `options` parameter and conditionally enable
tracing and video:

```javascript
// In playwright.config.js written to the container
use: {
  baseURL: '${baseUrl}',
  headless: ${headless},
  screenshot: 'only-on-failure',
  trace: 'on',                         // always record trace
  video: ${recordVideo ? "'on'" : "'off'"},
},
outputDir: '/work/test-results',
```

Always record trace. Record video only when the execution request specifies
`headed: true`.

**Update `ExecutionRequest` in `lib/execution/types.ts`:**

```typescript
headed?: boolean;   // default false; triggers video recording + headless: false
```

**After the container exits**, before cleanup:

1. Locate `test-results/**/*.zip` — this is the trace file. Copy it to
   `.sandbox/traces/<runId>/trace.zip` (do not delete with the run dir).
2. Locate `test-results/**/*.webm` — video if recorded. Copy to
   `.sandbox/traces/<runId>/video.webm`.
3. Return `runId` in `ExecutionResult`:

```typescript
// Add to ExecutionResult in types.ts
runId?: string;   // present when trace was recorded; used to fetch trace data
```

**Trace retention:** Delete trace directories older than 30 minutes via a lazy cleanup
check at the start of each new run (no background worker needed).

---

## Part 2 — Trace API routes

Three new routes under `app/api/trace/[runId]/`:

### `GET /api/trace/[runId]/actions`

Parse `trace.zip` and return a JSON array of steps.

Use the `adm-zip` or `unzipper` npm package to read the zip. The main trace file inside
is named `trace.trace` and contains newline-delimited JSON events.

Filter to events of type `"before"` paired with `"action"` — these are the user-visible
steps. Return:

```typescript
interface TraceStep {
  index: number;
  action: string;          // e.g. "page.goto", "locator.click", "expect.toBeVisible"
  params: Record<string, unknown>;  // url, selector string, expected value, etc.
  locator?: string;        // the locator expression e.g. "getByRole('button', {name:'Submit'})"
  boundingBox?: {          // pixel coords of matched element on the screenshot
    x: number;
    y: number;
    width: number;
    height: number;
  };
  screenshotRef: string;   // sha of the "after" screenshot resource
  durationMs: number;
  error?: string;          // if this step threw
  sourceLine?: number;     // line number in player.spec.ts from the call stack
}
```

For `boundingBox`: look for the `"input"` snapshot on the action event — it contains
`targetBoundingBox`. Fall back to undefined if absent (some actions like `goto` have no
target element).

### `GET /api/trace/[runId]/frame/[sha]`

Serve the PNG screenshot resource from inside the trace zip.
Set `Content-Type: image/png` and `Cache-Control: public, max-age=3600`.

### `GET /api/trace/[runId]/video`

Serve the `.webm` video file with correct MIME type (`video/webm`).
Return 404 if no video was recorded for this run.

---

## Part 3 — Annotation mapping

### `POST /api/trace/[runId]/annotate`

Accepts the grading result's `lineComments` array. Returns each comment enriched with
the trace step index it maps to.

**Mapping algorithm:**

For each `lineComment` with a `line` number:
1. Find the `TraceStep` whose `sourceLine` is closest to `lineComment.line`.
2. If no step has a `sourceLine` within ±2 lines, map to `stepIndex: null` (render as
   a general note rather than anchored to a step).

Return:

```typescript
interface AnnotatedComment {
  stepIndex: number | null;
  type: "error" | "warning" | "suggestion" | "praise";
  message: string;
  citation?: string;
}
```

---

## Part 4 — TracePlayer UI component

**File: `components/TracePlayer/TracePlayer.tsx`** (new)

A full-screen modal overlay that opens on top of the IDE.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Close   |  Step 3 of 12: locator.click                   │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│   Page screenshot            │   Step list (scrollable)     │
│   with highlight box         │                              │
│   drawn over matched         │   1  page.goto               │
│   element                    │   2  locator.fill            │
│                              │ ▶ 3  locator.click  ●        │
│                              │   4  expect.toBeVisible      │
│                              │   ...                        │
├──────────────────────────────┴──────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🤖  Line 14 — getByRole('button') matched 3 elements │   │
│  │     here. Playwright picked the first one, which     │   │
│  │     happened to be right — but this is a strict mode │   │
│  │     violation waiting to happen. See locators.md.    │   │
│  └──────────────────────────────────────────────────────┘   │
│  [ ← Prev ]                                    [ Next → ]   │
└─────────────────────────────────────────────────────────────┘
```

### Screenshot rendering

Render the screenshot for the current step as an `<img>`. If the step has a
`boundingBox`, overlay a semi-transparent highlight rectangle using an absolutely
positioned `<div>` with a colored border (green for passing steps, red for the failing
step). Scale the bounding box to the rendered image dimensions.

### Chat bubble

When the current step has an `AnnotatedComment`:
- Render a bubble at the bottom of the modal.
- Tone maps to color: `error` → rose, `warning` → amber, `suggestion` → sky,
  `praise` → emerald.
- If the step has no comment, show nothing (do not show a placeholder).

### Step list

Each item in the step list shows:
- Action name (human-readable: "Click button" not "locator.click")
- A colored dot if the step has a tutor comment
- A ✗ icon on the step that threw an error
- Clicking any step navigates to it

### Navigation

Prev/Next buttons and left/right arrow keys move between steps. On opening, jump
directly to the first step that has a tutor comment (or the failing step on failure).

### Opening and closing

Export a `useTracePlayer` hook:

```typescript
const { open, close, isOpen } = useTracePlayer();
open({ runId, annotatedComments });
```

Call `open` from `PlaywrightIDE` after grading completes:
- If the test **failed**: open automatically.
- If the test **passed**: render a "Replay Test ▶" button in the Output tab that calls
  `open`.

---

## Part 5 — Quasi-terminal

**File: `components/IDE/Terminal.tsx`** (new)

Add a third bottom tab: **Terminal**. Always visible alongside Output and Feedback.

### Stack

Use `xterm.js` (`@xterm/xterm` + `@xterm/addon-fit`). This is the same terminal
emulator VS Code uses.

### Command interception

The terminal does not connect to a real shell. It intercepts the user's input line on
Enter and routes it:

```typescript
const COMMANDS: Record<string, ExecutionMode> = {
  'npx playwright test':                  'standard',
  'npx playwright test --headed':         'headed',
  'npx playwright test --trace on':       'standard',   // trace is always on; note it
  'npx playwright test --ui':             'ui-mode',    // explain what happens
  'npx playwright test --debug':          'debug-mode', // explain what happens
};
```

**Routing:**

| Command | Behaviour |
|---------|-----------|
| `npx playwright test` | Triggers standard run. Streams output into terminal. |
| `npx playwright test --headed` | Triggers headed run (video recording). After run, shows video playback button. Prints note: "Running headed via Docker with Xvfb. Video recorded." |
| `npx playwright test --trace on` | Triggers standard run. Prints note: "Trace is always recorded in PlaywrightStagecraft." |
| `npx playwright test --ui` | Triggers standard run + opens TracePlayer. Prints note: "UI mode isn't available in-browser — opening the built-in Trace Player instead." |
| `npx playwright test --debug` | Triggers standard run + opens TracePlayer in step-through mode (paused at step 1). Prints note: "Debug mode launched in Trace Player — use arrow keys to step through." |
| Anything else | Prints: "Unknown command. Try: npx playwright test [--headed] [--ui] [--debug]" |

All terminal output (including the streamed SSE lines from the runner) is written into
the xterm instance using `term.write(line + '\r\n')`. This replaces the existing Output
tab for terminal-triggered runs.

### Startup message

When the terminal mounts, print:

```
PlaywrightStagecraft Terminal
Run your tests as you would locally:

  npx playwright test              run tests (standard)
  npx playwright test --headed     run with video recording
  npx playwright test --ui         open Trace Player after run
  npx playwright test --debug      step through in Trace Player

Your test file is pre-loaded. Just run.
```

---

## Part 6 — Video playback (headed mode)

When a run was recorded with video (`ExecutionResult.runId` present and headed was
requested):

Add a "Play Recording ▶" button in the Output tab alongside the existing result info.
Clicking it opens a simple modal with an HTML `<video>` element pointing to
`/api/trace/[runId]/video`. No custom player needed — native video controls are fine.

---

## Part 7 — Wire it all together in PlaywrightIDE

**File: `components/IDE/PlaywrightIDE.tsx`**

After grading completes:

```typescript
// Fetch annotations
const annotateRes = await fetch(`/api/trace/${execution.runId}/annotate`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ lineComments: gradingResult.feedback.lineComments }),
});
const { annotatedComments } = await annotateRes.json();

// Open trace player
if (!execution.passed) {
  tracePlayer.open({ runId: execution.runId, annotatedComments });
} else {
  // Store for the "Replay" button in Output tab
  setReplayData({ runId: execution.runId, annotatedComments });
}
```

---

## New npm packages needed

```bash
npm install @xterm/xterm @xterm/addon-fit adm-zip
npm install --save-dev @types/adm-zip
```

`adm-zip` is used server-side only (in the API routes) for trace.zip parsing.

---

## Acceptance criteria

- [ ] Trace is recorded for every run; `runId` returned in `ExecutionResult`
- [ ] `/api/trace/[runId]/actions` returns correctly parsed steps with bounding boxes where available
- [ ] `/api/trace/[runId]/frame/[sha]` serves screenshots from inside the zip
- [ ] TracePlayer opens automatically on test failure after grading completes
- [ ] TracePlayer shows "Replay ▶" button on passing runs
- [ ] Highlight box renders over the matched element on the screenshot
- [ ] Tutor chat bubbles appear on steps that have an `AnnotatedComment`
- [ ] Terminal tab accepts `npx playwright test` and streams output
- [ ] `--ui` and `--debug` flags open TracePlayer with correct note printed to terminal
- [ ] `--headed` triggers video recording; video playback button appears after run
- [ ] Trace directories older than 30 minutes are lazily cleaned up
- [ ] LocalRunner is NOT modified — trace features require DockerRunner

## Notes for LocalRunner users

If `EXECUTION_RUNNER=local`, `runId` will be undefined and TracePlayer will not be
available. The terminal will still work and will print a note: "Trace Player requires
Docker mode. Set EXECUTION_RUNNER=docker and ensure Docker Desktop is running."
