"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { TraceStep, AnnotatedComment } from "@/lib/trace/types";

interface Props {
  runId: string;
  annotatedComments: AnnotatedComment[];
  stepThrough?: boolean;
  onClose: () => void;
}

export default function TracePlayer({
  runId,
  annotatedComments,
  stepThrough = false,
  onClose,
}: Props) {
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const stepListRef = useRef<HTMLDivElement>(null);

  // Fetch steps when mounted.
  useEffect(() => {
    fetch(`/api/trace/${runId}/actions`)
      .then((r) => r.json())
      .then((data: { steps?: TraceStep[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        const fetched = data.steps ?? [];
        setSteps(fetched);

        // Jump to first step with a comment, or the failing step, or step 0.
        const commentedIndices = new Set(
          annotatedComments.filter((c) => c.stepIndex !== null).map((c) => c.stepIndex!)
        );
        const failingStep = fetched.findIndex((s) => s.error);
        const firstCommented = fetched.findIndex((s) => commentedIndices.has(s.index));

        if (stepThrough) {
          setCurrentIndex(0);
        } else if (failingStep !== -1) {
          setCurrentIndex(failingStep);
        } else if (firstCommented !== -1) {
          setCurrentIndex(firstCommented);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [runId, annotatedComments, stepThrough]);

  const goTo = useCallback(
    (idx: number) => setCurrentIndex(Math.max(0, Math.min(steps.length - 1, idx))),
    [steps.length]
  );

  // Keyboard navigation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo(currentIndex + 1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo(currentIndex - 1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, goTo, onClose]);

  // Scroll active step into view.
  useEffect(() => {
    const el = stepListRef.current?.querySelector(`[data-step="${currentIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [currentIndex]);

  const step = steps[currentIndex] ?? null;
  const comment = annotatedComments.find((c) => c.stepIndex === step?.index) ?? null;
  const commentedSet = new Set(
    annotatedComments.filter((c) => c.stepIndex !== null).map((c) => c.stepIndex!)
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ← Close
        </button>
        <span className="text-xs text-zinc-500">|</span>
        <span className="text-sm font-medium">
          {loading
            ? "Loading trace…"
            : error
              ? "Trace error"
              : steps.length === 0
                ? "No steps recorded"
                : `Step ${currentIndex + 1} of ${steps.length}: ${humanAction(step?.action ?? "")}`}
        </span>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Parsing trace…
        </div>
      )}
      {error && (
        <div className="flex flex-1 items-center justify-center text-sm text-rose-400">
          {error}
        </div>
      )}

      {!loading && !error && steps.length > 0 && (
        <>
          {/* Main body */}
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Screenshot pane */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-900 p-4">
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
            </div>

            {/* Step list */}
            <div
              ref={stepListRef}
              className="flex h-64 flex-col overflow-y-auto border-t border-zinc-800 bg-zinc-950 lg:h-auto lg:w-72 lg:border-l lg:border-t-0"
            >
              {steps.map((s) => (
                <button
                  key={s.index}
                  type="button"
                  data-step={s.index}
                  onClick={() => goTo(s.index)}
                  className={`flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                    s.index === currentIndex
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <span className="w-5 shrink-0 font-mono text-zinc-600">
                    {s.index + 1}
                  </span>
                  <span className="flex-1 truncate">{humanAction(s.action)}</span>
                  {s.error && (
                    <span className="shrink-0 text-rose-400" aria-label="Error">✗</span>
                  )}
                  {commentedSet.has(s.index) && !s.error && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-label="Comment" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Comment bubble */}
          {comment && (
            <div className={`border-t px-4 py-3 text-sm ${bubbleTone(comment.type)}`}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-base">🤖</span>
                <div>
                  <span className="font-semibold uppercase text-xs tracking-wide opacity-75">
                    {comment.type}
                    {step?.sourceLine ? ` · Line ${step.sourceLine}` : ""}
                  </span>
                  <p className="mt-0.5 text-zinc-200">{comment.message}</p>
                  {comment.citation && (
                    <p className="mt-0.5 font-mono text-[10px] opacity-60">
                      cite: {comment.citation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4 py-2">
            <button
              type="button"
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs text-zinc-600">
              {currentIndex + 1} / {steps.length}
            </span>
            <button
              type="button"
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex >= steps.length - 1}
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ScreenshotView({
  runId,
  sha,
  boundingBox,
  hasError,
}: {
  runId: string;
  sha: string;
  boundingBox?: TraceStep["boundingBox"];
  hasError: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const handleLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setImgSize({ w: img.clientWidth, h: img.clientHeight });
  };

  // Recalculate rendered size on resize.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const observer = new ResizeObserver(() => {
      setImgSize({ w: img.clientWidth, h: img.clientHeight });
    });
    observer.observe(img);
    return () => observer.disconnect();
  }, []);

  const src = `/api/trace/${runId}/frame/${sha}`;

  const highlight =
    boundingBox && imgSize && naturalSize
      ? scaleBox(boundingBox, naturalSize, imgSize)
      : null;

  return (
    <div className="relative inline-block max-h-full max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt="Test step screenshot"
        onLoad={handleLoad}
        className="block max-h-[calc(100vh-220px)] max-w-full rounded border border-zinc-700 object-contain"
      />
      {highlight && (
        <div
          className={`pointer-events-none absolute rounded border-2 ${
            hasError ? "border-rose-400 bg-rose-400/10" : "border-emerald-400 bg-emerald-400/10"
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

function scaleBox(
  box: NonNullable<TraceStep["boundingBox"]>,
  natural: { w: number; h: number },
  rendered: { w: number; h: number }
) {
  const scaleX = rendered.w / natural.w;
  const scaleY = rendered.h / natural.h;
  return {
    x: box.x * scaleX,
    y: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  };
}

function humanAction(apiName: string): string {
  const map: Record<string, string> = {
    "page.goto": "Go to page",
    "page.reload": "Reload",
    "page.goBack": "Go back",
    "page.goForward": "Go forward",
    "page.waitForURL": "Wait for URL",
    "page.waitForLoadState": "Wait for load",
    "locator.click": "Click",
    "locator.dblclick": "Double click",
    "locator.fill": "Fill",
    "locator.type": "Type",
    "locator.press": "Press key",
    "locator.check": "Check",
    "locator.uncheck": "Uncheck",
    "locator.selectOption": "Select option",
    "locator.hover": "Hover",
    "locator.focus": "Focus",
    "locator.blur": "Blur",
    "locator.waitFor": "Wait for element",
    "expect.toBeVisible": "Assert visible",
    "expect.toBeHidden": "Assert hidden",
    "expect.toHaveText": "Assert text",
    "expect.toHaveValue": "Assert value",
    "expect.toHaveURL": "Assert URL",
    "expect.toHaveTitle": "Assert title",
    "expect.toHaveCount": "Assert count",
    "expect.toBeChecked": "Assert checked",
    "expect.toBeEnabled": "Assert enabled",
    "expect.toBeDisabled": "Assert disabled",
  };
  return map[apiName] ?? apiName;
}

function bubbleTone(type: AnnotatedComment["type"]): string {
  switch (type) {
    case "error": return "border-rose-800 bg-rose-950/60 text-rose-200";
    case "warning": return "border-amber-800 bg-amber-950/60 text-amber-200";
    case "suggestion": return "border-sky-800 bg-sky-950/60 text-sky-200";
    case "praise": return "border-emerald-800 bg-emerald-950/60 text-emerald-200";
  }
}
