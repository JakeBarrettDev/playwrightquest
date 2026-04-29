"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export type MaskExpression = "neutral" | "pleased" | "concerned" | "delighted";

export interface MaskLine {
  text: string;
  expression: MaskExpression;
  /** Index into the trace actions array — the trace player scrubs here when this line plays. */
  traceStepIndex?: number;
}

export interface MaskTutorProps {
  lines: MaskLine[];
  isVisible: boolean;
  onStepChange?: (stepIndex: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
  typingSpeedMs?: number;
}

const TUTOR_EXPRESSIONS: Record<MaskExpression, string> = {
  neutral: "/masks/tutor-frames/tutor-default.png",
  pleased: "/masks/tutor-frames/tutor-delight.png",
  concerned: "/masks/tutor-frames/tutor-concern.png",
  delighted: "/masks/tutor-frames/tutor-surprise.png",
};

// Cycled while the typewriter is active so the mask appears to be speaking.
// On line completion, the image snaps back to the line's expression.
const TUTOR_TALKING_FRAMES: string[] = [
  "/masks/tutor-frames/tutor-talking-01.png",
  "/masks/tutor-frames/tutor-talking-02.png",
  "/masks/tutor-frames/tutor-talking-03.png",
  "/masks/tutor-frames/tutor-talking-04.png",
];

const TALKING_FRAME_MS = 110;
const CURSOR_HOLD_MS = 400;
const AUTO_ADVANCE_MS = 1800;

export default function TutorMask({
  lines,
  isVisible,
  onStepChange,
  onComplete,
  autoPlay = true,
  typingSpeedMs = 28,
}: MaskTutorProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [talkingFrame, setTalkingFrame] = useState(0);
  // Tracks whether the post-typing cursor has timed out for the current line.
  const [cursorDecayed, setCursorDecayed] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Reset state on script change (new post-mortem) and on line advance using
  // the "compare prev" pattern — avoids setState-in-effect cascades.
  const [trackedLines, setTrackedLines] = useState(lines);
  const [trackedLineIndex, setTrackedLineIndex] = useState(0);

  if (trackedLines !== lines) {
    setTrackedLines(lines);
    setTrackedLineIndex(0);
    setLineIndex(0);
    setProgress(0);
    setTalkingFrame(0);
    setCursorDecayed(false);
    setCompleted(false);
  } else if (trackedLineIndex !== lineIndex) {
    setTrackedLineIndex(lineIndex);
    setProgress(0);
    setTalkingFrame(0);
    setCursorDecayed(false);
  }

  const currentLine = lines[lineIndex] ?? null;
  const isLastLine = lineIndex >= lines.length - 1;
  const lineLength = currentLine?.text.length ?? 0;
  const isTyping = currentLine !== null && progress < lineLength;
  const lineFinished = currentLine !== null && !isTyping;

  // Fire onStepChange when this line begins. Identifies "begin" by progress=0
  // and a defined traceStepIndex; runs once per (lineIndex, lines) tuple.
  useEffect(() => {
    if (!isVisible || !currentLine) return;
    if (currentLine.traceStepIndex === undefined) return;
    onStepChange?.(currentLine.traceStepIndex);
    // Only fires when lineIndex changes; the values referenced below are
    // captured fresh from each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIndex, lines, isVisible]);

  // Typewriter interval — only runs while typing remains.
  useEffect(() => {
    if (!isVisible || !currentLine || !isTyping) return;
    const id = setInterval(() => {
      setProgress((p) => Math.min(currentLine.text.length, p + 1));
    }, typingSpeedMs);
    return () => clearInterval(id);
  }, [isVisible, currentLine, isTyping, typingSpeedMs]);

  // Talking-frame cycle — runs only while typing.
  useEffect(() => {
    if (!isVisible || !isTyping) return;
    const id = setInterval(() => {
      setTalkingFrame((f) => (f + 1) % TUTOR_TALKING_FRAMES.length);
    }, TALKING_FRAME_MS);
    return () => clearInterval(id);
  }, [isVisible, isTyping]);

  // After typing finishes, decay the cursor after 400ms. cursorDecayed is
  // reset to false on line change via the prev-tracking block above, so the
  // cursor reappears with each new line.
  useEffect(() => {
    if (!lineFinished || cursorDecayed) return;
    const id = setTimeout(() => setCursorDecayed(true), CURSOR_HOLD_MS);
    return () => clearTimeout(id);
  }, [lineFinished, cursorDecayed]);

  // Auto-advance when enabled.
  useEffect(() => {
    if (!autoPlay || !lineFinished || isLastLine) return;
    const id = setTimeout(() => {
      setLineIndex((i) => i + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [autoPlay, lineFinished, isLastLine]);

  const handleSkip = useCallback(() => {
    if (!currentLine) return;
    setProgress(currentLine.text.length);
  }, [currentLine]);

  const handleContinue = useCallback(() => {
    if (isLastLine) {
      if (!completed) {
        setCompleted(true);
        onComplete?.();
      }
      return;
    }
    setLineIndex((i) => i + 1);
  }, [isLastLine, completed, onComplete]);

  if (!isVisible || !currentLine) return null;

  const expressionSrc = TUTOR_EXPRESSIONS[currentLine.expression];
  const imageSrc = isTyping ? TUTOR_TALKING_FRAMES[talkingFrame] : expressionSrc;
  const displayedText = currentLine.text.slice(0, progress);
  const showCursor = isTyping || !cursorDecayed;

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[60] border-t-2 border-green-500 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-live="polite"
      aria-label="Mask tutor commentary"
    >
      <div className="mx-auto flex max-w-6xl items-stretch gap-4 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4">
        <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
          {/* `key` swap forces a fresh render → opacity transition reads as a crossfade. */}
          <Image
            key={imageSrc}
            src={imageSrc}
            alt=""
            width={128}
            height={128}
            priority
            className="h-full w-full object-contain transition-opacity duration-200"
            style={{
              filter: "drop-shadow(0 0 12px rgba(34, 197, 94, 0.55))",
            }}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-500/80">
              The Tutor
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-[10px] text-green-500/60">
                {lineIndex + 1} / {lines.length}
              </span>
              {isTyping ? (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="rounded border border-green-700 px-2 py-0.5 font-mono text-[10px] text-green-300 hover:bg-green-900/40"
                  aria-label="Skip typewriter effect"
                >
                  SKIP ▶
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="rounded border border-green-500 bg-green-900/30 px-2 py-0.5 font-mono text-[10px] text-green-200 hover:bg-green-800/50"
                  aria-label={isLastLine ? "Finish post-mortem" : "Continue to next line"}
                  autoFocus
                >
                  {isLastLine ? "DONE ▶" : "CONTINUE ▶"}
                </button>
              )}
            </div>
          </div>

          <p className="mt-1 min-h-[3.5rem] whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-green-300 sm:text-base">
            {displayedText}
            {showCursor && (
              <span className="ml-0.5 inline-block animate-pulse text-green-400">▮</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
