"use client";

import type {
  GradeResponse,
  GradingResult,
  LineComment,
} from "@/lib/types/grading";

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "error"; message: string }
  | { kind: "result"; response: GradeResponse };

interface Props {
  state: State;
  onJumpToLine?: (line: number) => void;
}

export default function FeedbackPanel({ state, onJumpToLine }: Props) {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="px-4 py-3">
        {state.kind === "idle" && (
          <p className="text-xs text-zinc-500">
            Run the test to receive grading feedback.
          </p>
        )}

        {state.kind === "running" && (
          <p className="text-xs text-zinc-400">Grading your submission…</p>
        )}

        {state.kind === "error" && (
          <div className="rounded border border-rose-800 bg-rose-950/60 p-3">
            <div className="text-sm font-semibold text-rose-300">
              Grading failed
            </div>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-rose-200">
              {state.message}
            </pre>
          </div>
        )}

        {state.kind === "result" && (
          <ResultView
            response={state.response}
            onJumpToLine={onJumpToLine}
          />
        )}
      </div>
    </div>
  );
}

function ResultView({
  response,
  onJumpToLine,
}: {
  response: GradeResponse;
  onJumpToLine?: (line: number) => void;
}) {
  const { result, meta } = response;
  return (
    <div className="space-y-4 text-sm">
      <header className="flex flex-wrap items-center gap-3">
        <ScoreRing score={result.score} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <VerdictBadge passed={result.passed} />
            <span className="text-xs text-zinc-500">
              {meta.provider}
              {meta.model ? ` · ${meta.model}` : ""} ·{" "}
              {(meta.durationMs / 1000).toFixed(1)}s
              {meta.usage?.cachedInputTokens
                ? ` · cached ${meta.usage.cachedInputTokens.toLocaleString()} tok`
                : ""}
            </span>
          </div>
          <p className="mt-2 text-zinc-300">{result.feedback.summary}</p>
          <div className="mt-1 text-xs text-emerald-400">
            +{result.xpAwarded} XP awarded
            {result.hintsUsed > 0
              ? ` (${result.hintsUsed} hint${result.hintsUsed === 1 ? "" : "s"} used)`
              : ""}
          </div>
        </div>
      </header>

      <Breakdown result={result} />

      {result.feedback.failureArchaeology && (
        <section className="rounded border border-amber-800 bg-amber-950/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Failure archaeology
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-zinc-200">
            {result.feedback.failureArchaeology}
          </p>
        </section>
      )}

      {result.feedback.lineComments.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Line comments
          </h3>
          <ul className="space-y-1.5">
            {result.feedback.lineComments.map((c, i) => (
              <LineCommentRow
                key={i}
                comment={c}
                onJumpToLine={onJumpToLine}
              />
            ))}
          </ul>
        </section>
      )}

      {result.feedback.bestPracticeNotes.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Best practice notes
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-zinc-300">
            {result.feedback.bestPracticeNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Breakdown({ result }: { result: GradingResult }) {
  const rows: Array<[string, number]> = [
    ["Selector quality", result.breakdown.selector_quality],
    ["Assertion quality", result.breakdown.assertion_quality],
    ["AC coverage", result.breakdown.acceptance_criteria_coverage],
    ["Code quality", result.breakdown.code_quality],
  ];
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Breakdown
      </h3>
      <dl className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center gap-3">
            <dt className="w-36 shrink-0 text-xs text-zinc-400">{label}</dt>
            <dd className="flex-1">
              <div className="h-1.5 overflow-hidden rounded bg-zinc-800">
                <div
                  className={barColor(value)}
                  style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
              </div>
            </dd>
            <dd className="w-10 shrink-0 text-right font-mono text-xs text-zinc-300">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LineCommentRow({
  comment,
  onJumpToLine,
}: {
  comment: LineComment;
  onJumpToLine?: (line: number) => void;
}) {
  const tone: Record<LineComment["type"], string> = {
    error: "text-rose-300 bg-rose-950/40 border-rose-800",
    warning: "text-amber-300 bg-amber-950/40 border-amber-800",
    suggestion: "text-sky-300 bg-sky-950/40 border-sky-800",
    praise: "text-emerald-300 bg-emerald-950/40 border-emerald-800",
  };
  return (
    <li className={`rounded border p-2 ${tone[comment.type]}`}>
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => onJumpToLine?.(comment.line)}
          className="font-mono underline-offset-2 hover:underline"
          aria-label={`Jump to line ${comment.line}`}
        >
          L{comment.line}
        </button>
        <span className="uppercase">{comment.type}</span>
      </div>
      <p className="mt-0.5 text-sm text-zinc-200">{comment.message}</p>
      {comment.citation && (
        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
          cite: {comment.citation}
        </p>
      )}
    </li>
  );
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 90
      ? "#34d399"
      : clamped >= 70
        ? "#60a5fa"
        : clamped >= 40
          ? "#fbbf24"
          : "#fb7185";
  const dash = `${clamped}, 100`;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full">
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#27272a"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={dash}
          strokeDashoffset="25"
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-semibold text-zinc-100">
        {clamped}
      </span>
    </div>
  );
}

function VerdictBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={
        passed
          ? "rounded bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white"
          : "rounded bg-rose-700 px-2 py-0.5 text-xs font-semibold text-white"
      }
    >
      {passed ? "PASS" : "FAIL"}
    </span>
  );
}

function barColor(value: number): string {
  const v = Math.max(0, Math.min(100, value));
  if (v >= 90) return "h-full bg-emerald-500";
  if (v >= 70) return "h-full bg-sky-500";
  if (v >= 40) return "h-full bg-amber-500";
  return "h-full bg-rose-500";
}

export type { State as FeedbackState };
