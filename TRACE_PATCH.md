# Trace Player Patch — Two Fixes Before Merge

## Fix 1 — Stale closure bug in Terminal.tsx

**File: `components/IDE/Terminal.tsx`**

**The problem:** `term.onData` is registered once on mount and closes over the initial
values of `code` and `onExecutionComplete`. The `codeRef` and `onCompleteRef` refs are
correctly kept up to date but are never actually read. A player who edits their code
after the terminal mounts and then runs via the terminal executes the wrong version.

**The fix:** In the `term.onData` handler, replace `code` with `codeRef.current` and
`onExecutionComplete` with `onCompleteRef.current`:

```typescript
// Before
handleCommand(cmd, term, challenge, code, runningRef, onExecutionComplete);

// After
handleCommand(cmd, term, challenge, codeRef.current, runningRef, onCompleteRef.current);
```

That's the entire change. No other modifications to Terminal.tsx.

---

## Fix 2 — Video-based screenshots for the trace player

**The problem:** Playwright's per-action visual snapshots are HTML DOM snapshots stored
in `resources/*.html`, not PNGs, and are not referenced via `after.attachments`. The
parser's `screenshotAttachment` lookup returns undefined for almost every step, so the
trace player shows "No screenshot for this step" throughout. The only step that ever
shows a screenshot is the one that failed (because `screenshot: 'only-on-failure'`
produces a PNG attached at test level, not action level).

**The fix:** Record video on every run (not just headed), and use the video as the visual
backing for the trace player. Each step has a `durationMs` and a cumulative start time —
the player scrubs the video to the correct timestamp when the user navigates steps.

This is how most professional test platforms handle this. Video is one file, always
present, and works for every step without any per-frame extraction.

---

### 2a. Always record video in DockerRunner

**File: `lib/execution/dockerRunner.ts`**

In `buildPlaywrightConfig`, change `video` from conditional to always `'on'`:

```javascript
// Before
video: '${opts.recordVideo ? "on" : "off"}',

// After
video: 'on',
```

Remove `recordVideo` from the `ConfigOptions` interface and from all call sites.
The `headed` flag still controls `headless: true/false` — that stays unchanged.

---

### 2b. Add cumulative timestamps to TraceStep

**File: `lib/trace/types.ts`**

Add one field to `TraceStep`:

```typescript
export interface TraceStep {
  index: number;
  action: string;
  params: Record<string, unknown>;
  locator?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  screenshotRef?: string;
  durationMs: number;
  error?: string;
  sourceLine?: number;
  videoTimestampMs: number;   // ← add this: ms from video start to this action's midpoint
}
```

---

### 2c. Compute videoTimestampMs in the parser

**File: `lib/trace/parser.ts`**

The trace events include `startTime` on `before` events (milliseconds since epoch).
To convert to a video timestamp, subtract the startTime of the first action:

```typescript
// After building the steps array, compute video timestamps:
const firstStart = steps[0]?.params   // keep reading — use raw event times below
```

In practice: when building each step, record `rawStartTime = before.startTime`.
After all steps are built, find `originTime = Math.min(...steps.map(s => s.rawStartTime))`.
Then for each step: `videoTimestampMs = rawStartTime - originTime + durationMs / 2`.

The `+ durationMs / 2` positions the video at the midpoint of the action rather than
the start — this gives a better "what did the page look like during this action" frame.

**Implementation note:** Add `rawStartTime` as a temporary field during construction,
compute `videoTimestampMs` for all steps at the end, then strip `rawStartTime` before
returning. Do not expose `rawStartTime` in the `TraceStep` type.

---

### 2d. Update the actions route response

**File: `app/api/trace/[runId]/actions/route.ts`**

No changes needed — `videoTimestampMs` is part of `TraceStep` and will be included
in the JSON response automatically.

Also add the video duration to the response so the player can validate seek positions:

```typescript
// Return shape
return Response.json({
  steps,
  hasVideo: true,   // always true now
});
```

---

### 2e. Replace ScreenshotView with VideoScrubber in TracePlayer

**File: `components/TracePlayer/TracePlayer.tsx`**

Replace the `ScreenshotView` component and its `<img>` rendering with a `VideoScrubber`
component. The screenshot pane becomes a video element that seeks to the step's
timestamp when the current step changes.

```tsx
function VideoScrubber({
  runId,
  timestampMs,
  boundingBox,
  hasError,
}: {
  runId: string;
  timestampMs: number;
  boundingBox?: TraceStep["boundingBox"];
  hasError: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Seek to timestamp when step changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timestampMs / 1000;
  }, [timestampMs]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setNaturalSize({ w: video.videoWidth, h: video.videoHeight });
    setVideoSize({ w: video.clientWidth, h: video.clientHeight });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new ResizeObserver(() => {
      setVideoSize({ w: video.clientWidth, h: video.clientHeight });
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const highlight =
    boundingBox && videoSize && naturalSize
      ? scaleBox(boundingBox, naturalSize, videoSize)
      : null;

  return (
    <div ref={containerRef} className="relative inline-block max-h-full max-w-full">
      <video
        ref={videoRef}
        src={`/api/trace/${runId}/video`}
        onLoadedMetadata={handleLoadedMetadata}
        className="block max-h-[calc(100vh-220px)] max-w-full rounded border border-zinc-700 object-contain"
        // No controls — we drive seeking programmatically via step navigation.
        // muted to avoid autoplay restrictions.
        muted
        playsInline
        preload="auto"
      />
      {highlight && (
        <div
          className={`pointer-events-none absolute rounded border-2 ${
            hasError
              ? "border-rose-400 bg-rose-400/10"
              : "border-emerald-400 bg-emerald-400/10"
          }`}
          style={{
            left: highlight.x,
            top: highlight.y,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}
    </div>
  );
}
```

In the TracePlayer render, replace:

```tsx
// Before
{step?.screenshotRef ? (
  <ScreenshotView
    runId={runId}
    sha={step.screenshotRef}
    boundingBox={step.boundingBox}
    hasError={!!step.error}
  />
) : (
  <div className="text-sm text-zinc-500">No screenshot for this step</div>
)}

// After
<VideoScrubber
  runId={runId}
  timestampMs={step?.videoTimestampMs ?? 0}
  boundingBox={step?.boundingBox}
  hasError={!!step?.error}
/>
```

Remove the `ScreenshotView` component and the `scaleBox` import — `scaleBox` is now
used inside `VideoScrubber`, so keep the function but move it alongside the new component.

Remove `screenshotRef` from `TraceStep` in `types.ts` — it is no longer used. Also
remove the `screenshotAttachment` lookup from `parser.ts`.

---

## Acceptance criteria

- [ ] Editing code in the Monaco editor and then running via terminal executes the
      current code, not the version from when the terminal mounted
- [ ] Video is recorded for every run (not just headed), and `video.webm` is present
      in `.sandbox/traces/<runId>/` after any Docker run
- [ ] TracePlayer shows a video frame (not a blank panel) for every step
- [ ] Seeking to a different step visually updates the video to that step's timestamp
- [ ] Bounding box highlight renders over the video at the correct position
- [ ] `screenshotRef` field removed from TraceStep (no longer needed)
- [ ] `hasVideo` field returned from `/api/trace/[runId]/actions` (always true)

## What NOT to change

- The `frame/[sha]` route can remain — it does no harm and may be useful later
- All other TracePlayer UI (step list, bubbles, keyboard nav, header) — untouched
- Terminal command routing — untouched
- All grading and execution pipeline — untouched
