# MASK_POSTMORTEM_SPEC.md
> Hand this to Claude Code (Opus) and let it run.
> Read this entire file before touching any code.
> No human approval needed mid-run. Work through all priorities in order.

---

## What This Builds

The green mask tutor system — the single most important feature in PlaywrightStagecraft. This is what sets the product apart from every other Playwright tutorial.

After a test run, the green mask appears in the lower third of the screen (retro RPG dialogue style), walks through the execution step by step with the Trace Player scrubbing to each relevant moment, delivers commentary line by line with expression changes, and awards a final score with a flourish.

The number one product priority is that this feels alive — not a report card, a performance.

---

## Asset Directory — Create This First

Create the directory:
```
public/masks/tutor-frames/
```

The developer refers to the green mask character as the **"tutor"**. Use this naming consistently throughout all components and comments. The mask IS the tutor.

Place placeholder SVGs for each expression state. These will be replaced by the developer's real animation frames — do not make them precious, just make them wired correctly.

Create `public/masks/tutor-frames/tutor-neutral.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <ellipse cx="60" cy="60" rx="50" ry="55" fill="#2d5a27" stroke="#1a3a15" stroke-width="3"/>
  <ellipse cx="42" cy="50" rx="10" ry="12" fill="#1a3a15"/>
  <ellipse cx="78" cy="50" rx="10" ry="12" fill="#1a3a15"/>
  <ellipse cx="42" cy="50" rx="5" ry="7" fill="#00ff41"/>
  <ellipse cx="78" cy="50" rx="5" ry="7" fill="#00ff41"/>
  <path d="M 40 80 Q 60 88 80 80" stroke="#1a3a15" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>
```

Create `public/masks/tutor-frames/tutor-pleased.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <ellipse cx="60" cy="60" rx="50" ry="55" fill="#2d5a27" stroke="#1a3a15" stroke-width="3"/>
  <ellipse cx="42" cy="50" rx="10" ry="12" fill="#1a3a15"/>
  <ellipse cx="78" cy="50" rx="10" ry="12" fill="#1a3a15"/>
  <ellipse cx="42" cy="48" rx="5" ry="7" fill="#00ff41"/>
  <ellipse cx="78" cy="48" rx="5" ry="7" fill="#00ff41"/>
  <path d="M 38 78 Q 60 95 82 78" stroke="#1a3a15" stroke-width="3" fill="#1a3a15" stroke-linecap="round"/>
</svg>
```

Create `public/masks/tutor-frames/tutor-concerned.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <ellipse cx="60" cy="60" rx="50" ry="55" fill="#2d5a27" stroke="#1a3a15" stroke-width="3"/>
  <ellipse cx="42" cy="50" rx="10" ry="12" fill="#1a3a15"/>
  <ellipse cx="78" cy="50" rx="10" ry="12" fill="#1a3a15"/>
  <ellipse cx="42" cy="52" rx="5" ry="7" fill="#00ff41"/>
  <ellipse cx="78" cy="52" rx="5" ry="7" fill="#00ff41"/>
  <path d="M 38 85 Q 60 75 82 85" stroke="#1a3a15" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M 35 42 L 50 46" stroke="#1a3a15" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 85 42 L 70 46" stroke="#1a3a15" stroke-width="2.5" stroke-linecap="round"/>
</svg>
```

Create `public/masks/tutor-frames/tutor-delighted.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <ellipse cx="60" cy="60" rx="50" ry="55" fill="#3a7a32" stroke="#1a3a15" stroke-width="3"/>
  <ellipse cx="42" cy="50" rx="10" ry="12" fill="#1a3a15"/>
  <ellipse cx="78" cy="50" rx="10" ry="12" fill="#1a3a15"/>
  <ellipse cx="42" cy="46" rx="6" ry="8" fill="#00ff41"/>
  <ellipse cx="78" cy="46" rx="6" ry="8" fill="#00ff41"/>
  <path d="M 35 76 Q 60 98 85 76" stroke="#1a3a15" stroke-width="3" fill="#1a3a15" stroke-linecap="round"/>
  <ellipse cx="38" cy="68" rx="6" ry="4" fill="#4a9a40" opacity="0.7"/>
  <ellipse cx="82" cy="68" rx="6" ry="4" fill="#4a9a40" opacity="0.7"/>
</svg>
```

**IMPORTANT NOTE FOR DEVELOPER:** Your real animation frames go in `public/masks/tutor-frames/` as:
- `tutor-neutral.png` (replaces tutor-neutral.svg)
- `tutor-pleased.png` (replaces tutor-pleased.svg)
- `tutor-concerned.png` (replaces tutor-concerned.svg)
- `tutor-delighted.png` (replaces tutor-delighted.svg)

Update the `TUTOR_EXPRESSIONS` constant in `components/TutorMask.tsx` to point to the `.png` paths. No other changes needed.

---

## Priority 1 — TutorMask Component

Create `components/TutorMask.tsx`.

This is the lower-third dialogue component. It should feel like an RPG character dialogue box — the mask on the left, text building out character by character on the right, expression changing based on the current sentiment.

### Props Interface

```typescript
export type MaskExpression = 'neutral' | 'pleased' | 'concerned' | 'delighted';

export interface MaskLine {
  text: string;
  expression: MaskExpression;
  traceStepIndex?: number; // which trace step to scrub to when this line plays
}

export interface MaskTutorProps {
  lines: MaskLine[];
  isVisible: boolean;
  onStepChange?: (stepIndex: number) => void; // fires when mask advances to a line with a traceStepIndex
  onComplete?: () => void; // fires when all lines have played
  autoPlay?: boolean; // default true
  typingSpeedMs?: number; // ms per character, default 28
}
```

### Layout

The component sits fixed at the bottom of the viewport, full width, above the terminal tab bar. Z-index above the trace player overlay.

```
┌─────────────────────────────────────────────────────────────────┐
│  [MASK IMAGE]  │  dialogue text builds out here...              │
│   120x120px    │                                         [▶ SKIP]│
└─────────────────────────────────────────────────────────────────┘
```

- Dark semi-transparent background (`bg-black/85 backdrop-blur-sm`)
- Green accent border on top (`border-t-2 border-green-500`)
- Mask image on the left with a subtle green glow (`drop-shadow` filter, green)
- Text area on the right, monospace font, green text on dark (`font-mono text-green-400`)
- A blinking cursor `▮` at the end of the currently typing line
- "SKIP ▶" button top right — skips typewriter effect, shows full line immediately
- "CONTINUE ▶" button appears (replaces skip) when a line finishes typing, advances to next line
- When all lines complete, "CONTINUE ▶" fires `onComplete`

### Expression Transition

When `expression` changes between lines, the mask image crossfades (CSS transition, 200ms opacity). Do not use a hard swap — the crossfade is what makes it feel alive.

```typescript
const TUTOR_EXPRESSIONS: Record<MaskExpression, string> = {
  neutral: '/masks/tutor-frames/tutor-neutral.svg',
  pleased: '/masks/tutor-frames/tutor-pleased.svg',
  concerned: '/masks/tutor-frames/tutor-concerned.svg',
  delighted: '/masks/tutor-frames/tutor-delighted.svg',
};
```

### Typing Effect

Use `setInterval` to append one character at a time from the current line's text. Clear on line advance or skip. Speed controlled by `typingSpeedMs` prop.

When a line finishes typing:
- Stop the interval
- Show blinking cursor for 400ms
- Replace cursor with "CONTINUE ▶" button
- If `autoPlay` is false, wait for user click
- If `autoPlay` is true, auto-advance after 1800ms

When advancing to a line with a `traceStepIndex`, fire `onStepChange(traceStepIndex)` before starting the new line's typewriter effect.

---

## Priority 2 — Post-Mortem Sequencer

Create `lib/postmortem/sequencer.ts`.

This takes the existing `GradingResult` (already produced by the grading pipeline) and the parsed trace actions (already produced by `lib/trace/parser.ts`) and produces an ordered array of `MaskLine[]` — the dialogue script for the mask to perform.

### Input Types

```typescript
import { GradingResult } from '@/lib/grading/types';
import { TraceAction } from '@/lib/trace/parser';

export interface PostMortemScript {
  lines: MaskLine[];
  finalGrade: string;    // e.g. "B+"
  finalScore: number;    // 0-100
  finalExpression: MaskExpression;
}
```

### Sequencer Logic

```typescript
export function buildPostMortemScript(
  result: GradingResult,
  actions: TraceAction[],
): PostMortemScript
```

**Opening line (always neutral):**
Generate an opening based on overall outcome:
- Pass + score >= 90: `"A flawless performance. Let's walk through it."` → delighted
- Pass + score >= 70: `"The curtain falls. A solid run — let's examine the craft."` → pleased  
- Pass + score < 70: `"You passed. But passing and performing are different things."` → neutral
- Fail: `"The performance did not land. Let's find out why."` → concerned

**Per-action lines:**
Iterate through `result.lineFeedback` (array of `{ lineNumber, sentiment, comment }`). For each item:
- Map `sentiment` to expression: `'positive' → 'pleased'`, `'negative' → 'concerned'`, `'neutral' → 'neutral'`
- Find the matching `TraceAction` by source line number (match `action.sourceLine` to `feedback.lineNumber`)
- Set `traceStepIndex` to the index of that action in the `actions` array
- Text is the feedback comment, prefixed with the line reference: `"Line 12 — [comment text]"`

**Closing line:**
- Score >= 90: expression `'delighted'`, text: `"A masterclass. The stage is yours."`
- Score >= 70: expression `'pleased'`, text: `"Good work. The craft improves with every run."`
- Score >= 50: expression `'neutral'`, text: `"The fundamentals are there. Study the brittle moments."`
- Score < 50: expression `'concerned'`, text: `"Back to rehearsal. The locators are fighting you — let them guide you instead."`

**Grade announcement (always last, always delighted or concerned):**
`"Your score: ${score}/100 — Grade: ${grade}"`
Expression: `score >= 70 ? 'delighted' : 'concerned'`

---

## Priority 3 — Post-Mortem Mode in the IDE

The post-mortem triggers automatically after a graded test run completes. It does not replace the Trace Player — it orchestrates it.

### State additions to the IDE component

```typescript
const [postMortemActive, setPostMortemActive] = useState(false);
const [postMortemScript, setPostMortemScript] = useState<PostMortemScript | null>(null);
const [tracePlayerStep, setTracePlayerStep] = useState<number>(0);
```

### Trigger logic

After the grading pipeline resolves with a `GradingResult` AND trace actions are available:

```typescript
const script = buildPostMortemScript(gradingResult, traceActions);
setPostMortemScript(script);
setPostMortemActive(true);
// Also open the Trace Player if not already open
setTracePlayerOpen(true);
```

### Wiring TutorMask into the IDE layout

Mount `<TutorMask>` at the bottom of the IDE layout, conditionally visible:

```tsx
{postMortemActive && postMortemScript && (
  <TutorMask
    lines={postMortemScript.lines}
    isVisible={true}
    onStepChange={(stepIndex) => setTracePlayerStep(stepIndex)}
    onComplete={() => setPostMortemActive(false)}
    autoPlay={false}
  />
)}
```

`autoPlay={false}` — the user advances the mask manually. This is intentional. They should be reading the commentary, not watching it scroll past.

### Trace Player step sync

The Trace Player component needs to accept a `controlledStep` prop (number | undefined). When provided, it overrides internal scrubbing and jumps the video to that action's timestamp.

Add to TracePlayer props:
```typescript
controlledStep?: number;
```

When `controlledStep` changes, scrub the video to `actions[controlledStep].videoTimestamp` and highlight that action in the action list.

---

## Priority 4 — Dismissal & Replay

When the mask post-mortem completes (`onComplete` fires):
- Mask slides out (CSS transform, translateY(100%), transition 400ms)
- Trace Player returns to user-controlled scrubbing (clear `controlledStep`)
- A "Try Again" button appears in the IDE header
- XP award animation plays (already exists, just trigger it here rather than immediately on grade)

The XP award should feel like a reward at the end of the post-mortem, not a popup that interrupts the commentary. Move the XP trigger to fire in `onComplete`.

---

## Priority 5 — Three Strikes UI (stub only)

Do not build the full Director mechanic yet. Just add the counter infrastructure:

```typescript
// In challenge state
const [attemptCount, setAttemptCount] = useState(0);
const [directorOffered, setDirectorOffered] = useState(false);
```

After each failed graded run, increment `attemptCount`. When `attemptCount >= 3 && !directorOffered`:
- Show a dismissible banner: *"The Director is watching from the wings. Would you like to see a masterclass performance?"*
- Two buttons: "Watch the Director" (stub — logs to console for now) and "Keep Going"
- Set `directorOffered = true` so the banner doesn't repeat

The Director execution logic is a future spec. Just wire the trigger.

---

## File Structure After This Chunk

```
public/
  masks/
    tutor-frames/
      tutor-neutral.svg      ← placeholder, replace with your .png
      tutor-pleased.svg      ← placeholder, replace with your .png
      tutor-concerned.svg    ← placeholder, replace with your .png
      tutor-delighted.svg    ← placeholder, replace with your .png

components/
  TutorMask.tsx              ← new

lib/
  postmortem/
    sequencer.ts             ← new

app/ (or components/IDE — wherever the IDE lives)
  IDE component              ← modified: post-mortem state, TutorMask mounted
  TracePlayer component      ← modified: controlledStep prop
```

---

## Definition of Done

- [ ] `public/masks/tutor-frames/` directory exists with 4 placeholder SVGs
- [ ] `TutorMask` renders in the lower third with typewriter text and expression images
- [ ] Expression crossfades on transition between lines
- [ ] Skip and Continue buttons work correctly
- [ ] `buildPostMortemScript` produces a valid `MaskLine[]` from a real `GradingResult`
- [ ] Post-mortem triggers automatically after a graded failed run
- [ ] Post-mortem triggers automatically after a graded passing run
- [ ] Trace Player scrubs to the correct step when the tutor advances to a line with a `traceStepIndex`
- [ ] XP award fires at post-mortem completion, not before
- [ ] Three-strikes banner appears after 3 failed runs (stub behavior is fine)
- [ ] Dropping a `.png` into `public/masks/tutor-frames/` and updating `TUTOR_EXPRESSIONS` paths is the only change needed to use real frames

---

## Notes for Claude Code

The grading pipeline (`lib/grading/`) is untouchable. Do not modify it. Read `GradingResult` types from it, do not change them.

The trace parser (`lib/trace/parser.ts`) is untouchable. Read `TraceAction` types from it.

The `TutorMask` component should have zero knowledge of grading or traces. It receives `MaskLine[]` and performs. The sequencer is where grading and trace data are combined.

If `lineFeedback` does not exist on `GradingResult` yet (check the type), add it as an optional field. Do not break existing grading behavior — the post-mortem is additive.

The developer's real tutor frames will be PNG files. The component should work with either SVG or PNG at the paths — Next.js `<Image>` handles both. Use `next/image` for the tutor display.

---

## Post-Build Cleanup — Stale Spec Files

After all priorities above are complete and verified working, audit the project root for stale `.md` spec files. These were instructions for previous build chunks and do not need to be retained once their objectives are confirmed implemented.

**Before deleting any file, verify its objectives are met** by checking the codebase for the features it specced. If something is partially implemented or in doubt, leave the file and add a comment at the top noting what remains.

Candidates for deletion (confirm implemented before removing):
- `NEXT_CHUNK.md` — DockerRunner + streaming. Confirm `lib/execution/dockerRunner.ts` exists and SSE streaming is wired.
- `CORPUS_IMPROVEMENTS.md` — Corpus quality pass. Confirm `toHaveAttribute`, `toBeChecked`, `expect.soft()`, strict mode docs, `getByAltText`, `getByTitle`, `test.describe`, `beforeEach`, `locator.waitFor` are all present in the corpus files.
- `TRACE_PATCH.md` — Video fix + stale closure fix. Confirm trace player video works and no stale closure issues remain.
- `TRACE_TUTOR_SPEC.md` — Trace player + terminal. Confirm TracePlayer component and xterm.js terminal tab both exist and function.
- `AUTONOMOUS_CHUNK.md` — LocalRunner trace/video, Dockerfile, Thornfield site, new challenges. Confirm all deliverables shipped.

**Do NOT delete:**
- `CLAUDE.md` / `AGENTS.md` — active agent rules, always retained
- `MASK_POSTMORTEM_SPEC.md` — this file, retain until the tutor post-mortem system is complete and signed off
- Any `.md` that serves as ongoing documentation rather than a one-time build instruction

After cleanup, the project root should only contain `.md` files that are either active specs, living documentation, or agent rules. One-time build chunks that have been fully executed have no reason to persist.
