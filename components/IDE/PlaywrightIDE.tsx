"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { playwrightDts } from "./playwrightTypes";
import { registerPlaywrightCompletions } from "./completions";
import Terminal, { type TerminalCommand } from "./Terminal";
import ChallengePanel from "@/components/Challenge/ChallengePanel";
import FeedbackPanel, {
  type FeedbackState,
} from "@/components/Feedback/FeedbackPanel";
import TracePlayer from "@/components/TracePlayer/TracePlayer";
import { useTracePlayer } from "@/components/TracePlayer/useTracePlayer";
import ProviderSettingsDialog from "@/components/Settings/ProviderSettingsDialog";
import {
  PROVIDER_LABELS,
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  maskApiKey,
  saveSettings,
  subscribeSettings,
  type ProviderSettings,
} from "@/lib/client/settings";
import type { Challenge } from "@/lib/types/challenge";
import type { ExecutionResult } from "@/lib/execution";
import type { GradeResponse } from "@/lib/types/grading";
import type { AnnotatedComment } from "@/lib/trace/types";

type BottomTab = "output" | "feedback" | "terminal";

type ExecutionResultShape = ExecutionResult;

interface ReplayData {
  runId: string;
  annotatedComments: AnnotatedComment[];
}

interface Props {
  challenge: Challenge;
}

export default function PlaywrightIDE({ challenge }: Props) {
  const [code, setCode] = useState(challenge.startingCode);
  const settings = useSyncExternalStore<ProviderSettings | null>(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [execResult, setExecResult] = useState<ExecutionResultShape | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle" });
  const [bottomTab, setBottomTab] = useState<BottomTab>("output");
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [videoModalRunId, setVideoModalRunId] = useState<string | null>(null);

  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const tracePlayer = useTracePlayer();
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const previewRef = useRef<SitePreviewHandle | null>(null);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution:
        monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowJs: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    });
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      // 80007: "'await' has no effect on the type of this expression". This
      // fires on `await page.getByRole(...)` because locators are synchronous.
      // Technically correct, but a beginner reading that warning is likely to
      // rip awaits off actions and assertions too (which DO return Promises)
      // and break their tests. Hide it for now; surface the lesson via the
      // grader's "You only await actions and assertions — locators are
      // synchronous" feedback instead. See ROADMAP §10.
      diagnosticCodesToIgnore: [80007],
    });
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      playwrightDts,
      "file:///node_modules/@playwright/test/index.d.ts"
    );
    registerPlaywrightCompletions(monaco);
  }, []);

  const handleJumpToLine = useCallback((line: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  }, []);

  const handleSaveSettings = useCallback((next: ProviderSettings) => {
    saveSettings(next);
    setSettingsOpen(false);
  }, []);

  const handleRequestHint = useCallback(async () => {
    if (!settings) {
      setSettingsOpen(true);
      return;
    }
    setHintLoading(true);
    const nextHintsUsed = hintsUsed + 1;
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model || undefined,
          challengeId: challenge.id,
          playerCode: code,
          hintsUsed,
        }),
      });
      const data = (await res.json()) as { hint?: string; error?: string };
      if (data.hint) {
        setHintsUsed(nextHintsUsed);
        setHintText(data.hint);
      }
    } catch {
      // hint failure is non-fatal
    } finally {
      setHintLoading(false);
    }
  }, [settings, challenge.id, code, hintsUsed]);

  // Shared grading + trace annotation logic used by both GUI run and terminal run.
  const performGrading = useCallback(
    async (
      execution: ExecutionResultShape,
      currentCode: string,
      command?: TerminalCommand
    ) => {
      if (!settings) return;

      setFeedback({ kind: "running" });
      setBottomTab("feedback");

      let gradingResponse: GradeResponse | null = null;
      try {
        const res = await fetch("/api/grade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model || undefined,
            challengeId: challenge.id,
            playerCode: currentCode,
            executionResult: execution,
            hintsUsed,
          }),
        });
        const data = (await res.json()) as GradeResponse | { error: string };
        if (!res.ok || "error" in data) {
          setFeedback({
            kind: "error",
            message: "error" in data ? data.error : `HTTP ${res.status}`,
          });
        } else {
          gradingResponse = data;
          setFeedback({ kind: "result", response: data });
        }
      } catch (e) {
        setFeedback({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }

      // Trace annotation + TracePlayer handling.
      if (execution.runId && gradingResponse) {
        try {
          const lineComments = gradingResponse.result.feedback.lineComments;
          const annotateRes = await fetch(
            `/api/trace/${execution.runId}/annotate`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ lineComments }),
            }
          );
          const { annotatedComments } = (await annotateRes.json()) as {
            annotatedComments: AnnotatedComment[];
          };

          const stepThrough = command?.kind === "debug";
          const shouldOpen =
            !execution.passed ||
            command?.kind === "ui" ||
            command?.kind === "debug";

          if (shouldOpen) {
            tracePlayer.open({
              runId: execution.runId,
              annotatedComments,
              stepThrough,
            });
          } else {
            setReplayData({ runId: execution.runId, annotatedComments });
          }
        } catch {
          // Annotation failure must not break the grading flow.
        }
      }
    },
    [challenge.id, settings, tracePlayer, hintsUsed]
  );

  const handleRun = useCallback(async () => {
    if (!settings) {
      setSettingsOpen(true);
      return;
    }

    setRunning(true);
    setOutputLines([]);
    setExecError(null);
    setExecResult(null);
    setFeedback({ kind: "idle" });
    setReplayData(null);
    setBottomTab("output");

    let execution: ExecutionResultShape | null = null;
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          site: challenge.site,
          challengeId: challenge.id,
        }),
      });

      if (!res.ok || !res.body) {
        setExecError(`HTTP ${res.status}`);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.replace(/^data: /, "").trim();
          if (!line) continue;
          try {
            const msg = JSON.parse(line) as
              | { type: "output"; line: string }
              | { type: "result"; result: ExecutionResultShape }
              | { type: "error"; message: string };
            if (msg.type === "output") {
              setOutputLines((prev) => [...prev, msg.line]);
            } else if (msg.type === "result") {
              execution = msg.result;
              setExecResult(msg.result);
            } else if (msg.type === "error") {
              setExecError(msg.message);
              setRunning(false);
              return;
            }
          } catch {
            // malformed chunk, skip
          }
        }
      }
    } catch (e) {
      setExecError(e instanceof Error ? e.message : String(e));
      setRunning(false);
      return;
    }

    if (!execution) {
      setExecError("No result received from runner");
      setRunning(false);
      return;
    }

    await performGrading(execution, code);
    setRunning(false);
  }, [challenge.id, challenge.site, code, settings, performGrading]);

  // Called by the Terminal component after it finishes its own execution fetch.
  const handleTerminalExecutionComplete = useCallback(
    async (result: ExecutionResultShape, command: TerminalCommand) => {
      setExecResult(result);
      setReplayData(null);
      await performGrading(result, code, command);
    },
    [code, performGrading]
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">
      <Toolbar
        challengeTitle={challenge.title}
        running={running}
        settings={settings}
        hintsUsed={hintsUsed}
        hintPenalty={challenge.hintPenalty}
        hintLoading={hintLoading}
        onRun={handleRun}
        onOpenSettings={() => setSettingsOpen(true)}
        onRequestHint={handleRequestHint}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          {hintText && (
            <HintPanel
              hint={hintText}
              hintsUsed={hintsUsed}
              hintPenalty={challenge.hintPenalty}
              onDismiss={() => setHintText(null)}
            />
          )}
          <div className="min-h-0 flex-1">
            <Editor
              defaultLanguage="typescript"
              language="typescript"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              onMount={handleMount}
              path="player-test.spec.ts"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                tabSize: 2,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 8 },
              }}
            />
          </div>
          <BottomPanel
            tab={bottomTab}
            onTabChange={setBottomTab}
            running={running}
            outputLines={outputLines}
            execResult={execResult}
            execError={execError}
            feedback={feedback}
            replayData={replayData}
            challenge={challenge}
            code={code}
            onJumpToLine={handleJumpToLine}
            onOpenTracePlayer={(data) =>
              tracePlayer.open({ runId: data.runId, annotatedComments: data.annotatedComments })
            }
            onOpenVideoModal={(runId) => setVideoModalRunId(runId)}
            onTerminalExecutionComplete={handleTerminalExecutionComplete}
          />
        </div>
        <ResizeHandle onDrag={handleRightResize} />
        <div
          className="flex min-h-0 w-full flex-col border-t border-zinc-800 lg:w-auto lg:shrink-0 lg:border-t-0"
          style={isWide ? { width: `${rightWidth}px` } : undefined}
        >
          <RightTabBar
            tab={rightTab}
            onTabChange={setRightTab}
            onPreviewReload={() => previewRef.current?.reload()}
          />
          <div className="relative min-h-0 flex-1">
            <div
              className={`absolute inset-0 ${rightTab === "challenge" ? "" : "hidden"}`}
            >
              <ChallengePanel challenge={challenge} />
            </div>
            <div
              className={`absolute inset-0 ${rightTab === "preview" ? "" : "hidden"}`}
            >
              <SitePreview ref={previewRef} site={challenge.site} />
            </div>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <ProviderSettingsDialog
          initial={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {tracePlayer.isOpen && tracePlayer.runId && (
        <TracePlayer
          runId={tracePlayer.runId}
          annotatedComments={tracePlayer.annotatedComments}
          stepThrough={tracePlayer.stepThrough}
          onClose={tracePlayer.close}
        />
      )}

      {videoModalRunId && (
        <VideoModal
          runId={videoModalRunId}
          onClose={() => setVideoModalRunId(null)}
        />
      )}
    </div>
  );
}

function Toolbar({
  challengeTitle,
  running,
  settings,
  hintsUsed,
  hintPenalty,
  hintLoading,
  onRun,
  onOpenSettings,
  onRequestHint,
}: {
  challengeTitle: string;
  running: boolean;
  settings: ProviderSettings | null;
  hintsUsed: number;
  hintPenalty: number;
  hintLoading: boolean;
  onRun: () => void;
  onOpenSettings: () => void;
  onRequestHint: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200">
      <div className="min-w-0 truncate">
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          Playwright IDE
        </span>
        <span className="ml-2 text-sm font-semibold">{challengeTitle}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {hintsUsed > 0 && (
          <span className="text-xs text-amber-400">
            -{hintsUsed * hintPenalty} XP
          </span>
        )}
        <button
          type="button"
          onClick={onRequestHint}
          disabled={hintLoading || running}
          title="Request a hint (costs XP)"
          className="rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-amber-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {hintLoading ? "…" : "Hint"}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          {settings
            ? `${PROVIDER_LABELS[settings.provider]} · ${maskApiKey(settings.apiKey)}`
            : "Set provider & key"}
        </button>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? "Running…" : "Run & Grade"}
        </button>
      </div>
    </div>
  );
}

function HintPanel({
  hint,
  hintsUsed,
  hintPenalty,
  onDismiss,
}: {
  hint: string;
  hintsUsed: number;
  hintPenalty: number;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-amber-900/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
      <span className="mt-0.5 shrink-0 text-base">💡</span>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">
            Hint {hintsUsed}
          </span>
          <span className="text-xs text-amber-600">
            (-{hintPenalty} XP)
          </span>
        </div>
        <p className="text-amber-100">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs text-amber-600 hover:text-amber-300"
        aria-label="Dismiss hint"
      >
        ✕
      </button>
    </div>
  );
}

function BottomPanel({
  tab,
  onTabChange,
  running,
  outputLines,
  execResult,
  execError,
  feedback,
  replayData,
  challenge,
  code,
  onJumpToLine,
  onOpenTracePlayer,
  onOpenVideoModal,
  onTerminalExecutionComplete,
}: {
  tab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  running: boolean;
  outputLines: string[];
  execResult: ExecutionResultShape | null;
  execError: string | null;
  feedback: FeedbackState;
  replayData: ReplayData | null;
  challenge: Challenge;
  code: string;
  onJumpToLine: (line: number) => void;
  onOpenTracePlayer: (data: ReplayData) => void;
  onOpenVideoModal: (runId: string) => void;
  onTerminalExecutionComplete: (result: ExecutionResultShape, command: TerminalCommand) => void;
}) {
  const nothingYet =
    !running &&
    outputLines.length === 0 &&
    !execResult &&
    !execError &&
    feedback.kind === "idle";

  // Terminal is always visible; other tabs only appear after a run.
  const showOutputAndFeedback = !nothingYet;

  return (
    <div className="flex min-h-0 max-h-[45vh] flex-col border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-2 py-1.5">
        {showOutputAndFeedback && (
          <>
            <TabButton
              active={tab === "output"}
              onClick={() => onTabChange("output")}
              label="Output"
              badge={execResult ? (execResult.passed ? "PASS" : "FAIL") : undefined}
              badgeTone={execResult?.passed ? "emerald" : execResult ? "rose" : null}
            />
            <TabButton
              active={tab === "feedback"}
              onClick={() => onTabChange("feedback")}
              label="Feedback"
              badge={
                feedback.kind === "result"
                  ? String(feedback.response.result.score)
                  : feedback.kind === "running"
                    ? "…"
                    : feedback.kind === "error"
                      ? "!"
                      : undefined
              }
              badgeTone={
                feedback.kind === "result"
                  ? feedback.response.result.score >= 70
                    ? "emerald"
                    : "amber"
                  : feedback.kind === "error"
                    ? "rose"
                    : null
              }
            />
          </>
        )}
        <TabButton
          active={tab === "terminal"}
          onClick={() => onTabChange("terminal")}
          label="Terminal"
          badgeTone={null}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "output" && showOutputAndFeedback && (
          <OutputView
            running={running}
            outputLines={outputLines}
            result={execResult}
            error={execError}
            replayData={replayData}
            onOpenTracePlayer={onOpenTracePlayer}
            onOpenVideoModal={onOpenVideoModal}
          />
        )}
        {tab === "feedback" && showOutputAndFeedback && (
          <FeedbackPanel state={feedback} onJumpToLine={onJumpToLine} />
        )}
        {tab === "terminal" && (
          <Terminal
            challenge={challenge}
            code={code}
            onExecutionComplete={onTerminalExecutionComplete}
          />
        )}
        {(tab === "output" || tab === "feedback") && !showOutputAndFeedback && (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            Run a test to see results here.
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
  badgeTone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
  badgeTone: "emerald" | "amber" | "rose" | null;
}) {
  const toneClass =
    badgeTone === "emerald"
      ? "bg-emerald-600 text-white"
      : badgeTone === "amber"
        ? "bg-amber-600 text-white"
        : badgeTone === "rose"
          ? "bg-rose-600 text-white"
          : "bg-zinc-700 text-zinc-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
      }`}
    >
      {label}
      {badge !== undefined && (
        <span className={`rounded px-1.5 py-0.5 text-[10px] ${toneClass}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function OutputView({
  running,
  outputLines,
  result,
  error,
  replayData,
  onOpenTracePlayer,
  onOpenVideoModal,
}: {
  running: boolean;
  outputLines: string[];
  result: ExecutionResultShape | null;
  error: string | null;
  replayData: ReplayData | null;
  onOpenTracePlayer: (data: ReplayData) => void;
  onOpenVideoModal: (runId: string) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3 font-mono text-xs text-zinc-100">
      {outputLines.length > 0 && (
        <div className="mb-2 space-y-0.5">
          {outputLines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap text-zinc-300">
              {line}
            </div>
          ))}
        </div>
      )}
      {running && !result && outputLines.length === 0 && (
        <div className="text-zinc-400">Running Playwright…</div>
      )}

      {error && (
        <div className="text-rose-400">
          <div className="font-semibold">Request failed</div>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-zinc-400">
            <span>exit {result.exitCode} · {(result.durationMs / 1000).toFixed(2)}s</span>
            {replayData && (
              <button
                type="button"
                onClick={() => onOpenTracePlayer(replayData)}
                className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-zinc-800"
              >
                Replay Test ▶
              </button>
            )}
            {result.runId && (
              <button
                type="button"
                onClick={() => onOpenVideoModal(result.runId!)}
                className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-sky-400 hover:bg-zinc-800"
              >
                Play Recording ▶
              </button>
            )}
          </div>

          {result.errorMessage && (
            <div>
              <div className="font-semibold text-rose-400">Error</div>
              <pre className="whitespace-pre-wrap text-rose-300">
                {result.errorMessage}
              </pre>
            </div>
          )}

          {result.stdout && (
            <details open={!result.passed}>
              <summary className="cursor-pointer text-zinc-400">stdout</summary>
              <pre className="whitespace-pre-wrap text-zinc-300">
                {result.stdout}
              </pre>
            </details>
          )}

          {result.stderr && (
            <details>
              <summary className="cursor-pointer text-zinc-400">stderr</summary>
              <pre className="whitespace-pre-wrap text-zinc-300">
                {result.stderr}
              </pre>
            </details>
          )}

          {result.screenshotBase64 && (
            <details>
              <summary className="cursor-pointer text-zinc-400">
                failure screenshot
              </summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Playwright failure screenshot"
                src={`data:image/png;base64,${result.screenshotBase64}`}
                className="mt-2 max-w-full rounded border border-zinc-700"
              />
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function VideoModal({
  runId,
  onClose,
}: {
  runId: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded border border-zinc-700 bg-zinc-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-200">Test Recording</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-100"
          >
            ✕ Close
          </button>
        </div>
        <video
          src={`/api/trace/${runId}/video`}
          controls
          autoPlay
          className="w-full rounded border border-zinc-700"
        />
      </div>
    </div>
  );
}
