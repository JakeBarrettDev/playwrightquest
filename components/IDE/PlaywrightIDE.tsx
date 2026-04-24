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
import SitePreview, { type SitePreviewHandle } from "./SitePreview";
import ChallengePanel from "@/components/Challenge/ChallengePanel";
import FeedbackPanel, {
  type FeedbackState,
} from "@/components/Feedback/FeedbackPanel";
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

type BottomTab = "output" | "feedback";
type RightTab = "challenge" | "preview";

type ExecutionResultShape = ExecutionResult;

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
  const [execResult, setExecResult] = useState<ExecutionResultShape | null>(
    null
  );
  const [execError, setExecError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle" });
  const [bottomTab, setBottomTab] = useState<BottomTab>("output");
  const [rightTab, setRightTab] = useState<RightTab>("challenge");
  const [rightWidth, setRightWidth] = useState<number>(480);
  const [isWide, setIsWide] = useState<boolean>(false);

  useEffect(() => {
    // Restore the last user-chosen width; fall back to a sensible default.
    // `setState` inside an effect is normally discouraged, but this is a
    // one-shot hydration from a client-only source (localStorage) that has
    // no server-rendered equivalent.
    try {
      const saved = window.localStorage.getItem("pq.rightPanelWidth");
      if (saved) {
        const n = Number.parseInt(saved, 10);
        if (Number.isFinite(n) && n > 200) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRightWidth(n);
        }
      }
    } catch {
      /* localStorage blocked — fine */
    }

    // Only apply an explicit width in the row layout (lg+). Below lg the
    // panel stacks and should be full-width.
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsWide(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleRightResize = useCallback((deltaX: number) => {
    setRightWidth((w) => {
      // Handle is between editor (left) and right panel. Dragging the handle
      // LEFT (deltaX < 0) should GROW the right panel.
      const next = w - deltaX;
      const viewportW = window.innerWidth || 1600;
      const min = 280;
      const max = Math.max(min + 200, viewportW - 400);
      const clamped = Math.min(max, Math.max(min, next));
      try {
        window.localStorage.setItem(
          "pq.rightPanelWidth",
          String(Math.round(clamped))
        );
      } catch {
        /* ignore */
      }
      return clamped;
    });
  }, []);

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

  const handleRun = useCallback(async () => {
    if (!settings) {
      setSettingsOpen(true);
      return;
    }

    setRunning(true);
    setExecError(null);
    setExecResult(null);
    setFeedback({ kind: "idle" });
    setBottomTab("output");

    let execution: ExecutionResultShape;
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
      const data = (await res.json()) as ExecutionResultShape | { error: string };
      if (!res.ok || "error" in data) {
        setExecError("error" in data ? data.error : `HTTP ${res.status}`);
        setRunning(false);
        return;
      }
      execution = data;
      setExecResult(execution);
    } catch (e) {
      setExecError(e instanceof Error ? e.message : String(e));
      setRunning(false);
      return;
    }

    // Kick off grading immediately; leave running=true so the UI reflects
    // the full round-trip as one action.
    setFeedback({ kind: "running" });
    setBottomTab("feedback");
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model || undefined,
          challengeId: challenge.id,
          playerCode: code,
          executionResult: execution,
          hintsUsed: 0,
        }),
      });
      const data = (await res.json()) as GradeResponse | { error: string };
      if (!res.ok || "error" in data) {
        setFeedback({
          kind: "error",
          message: "error" in data ? data.error : `HTTP ${res.status}`,
        });
      } else {
        setFeedback({ kind: "result", response: data });
      }
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRunning(false);
    }
  }, [challenge.id, challenge.site, code, settings]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">
      <Toolbar
        challengeTitle={challenge.title}
        running={running}
        settings={settings}
        onRun={handleRun}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
            execResult={execResult}
            execError={execError}
            feedback={feedback}
            onJumpToLine={handleJumpToLine}
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
    </div>
  );
}

function Toolbar({
  challengeTitle,
  running,
  settings,
  onRun,
  onOpenSettings,
}: {
  challengeTitle: string;
  running: boolean;
  settings: ProviderSettings | null;
  onRun: () => void;
  onOpenSettings: () => void;
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

function BottomPanel({
  tab,
  onTabChange,
  running,
  execResult,
  execError,
  feedback,
  onJumpToLine,
}: {
  tab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  running: boolean;
  execResult: ExecutionResultShape | null;
  execError: string | null;
  feedback: FeedbackState;
  onJumpToLine: (line: number) => void;
}) {
  const nothingYet =
    !running && !execResult && !execError && feedback.kind === "idle";
  if (nothingYet) return null;

  return (
    <div className="flex min-h-0 max-h-[45vh] flex-col border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-2 py-1.5">
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
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "output" ? (
          <OutputView
            running={running}
            result={execResult}
            error={execError}
          />
        ) : (
          <FeedbackPanel state={feedback} onJumpToLine={onJumpToLine} />
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
  result,
  error,
}: {
  running: boolean;
  result: ExecutionResultShape | null;
  error: string | null;
}) {
  return (
    <div className="h-full overflow-auto p-3 font-mono text-xs text-zinc-100">
      {running && !result && (
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
          <div className="text-zinc-400">
            exit {result.exitCode} · {(result.durationMs / 1000).toFixed(2)}s
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

function ResizeHandle({
  onDrag,
}: {
  onDrag: (deltaX: number) => void;
}) {
  const draggingRef = useRef<{ lastX: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = { lastX: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
    // Prevent text selection elsewhere on the page while dragging.
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag) return;
    const delta = e.clientX - drag.lastX;
    drag.lastX = e.clientX;
    if (delta !== 0) onDrag(delta);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released */
    }
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize right panel"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="hidden w-1.5 shrink-0 cursor-col-resize bg-zinc-900 transition-colors hover:bg-emerald-600 active:bg-emerald-500 lg:block"
    />
  );
}

function RightTabBar({
  tab,
  onTabChange,
  onPreviewReload,
}: {
  tab: RightTab;
  onTabChange: (t: RightTab) => void;
  onPreviewReload: () => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-2 py-1.5">
      <RightTabButton
        active={tab === "challenge"}
        onClick={() => onTabChange("challenge")}
        label="Challenge"
      />
      <RightTabButton
        active={tab === "preview"}
        onClick={() => onTabChange("preview")}
        label="Preview"
      />
      {tab === "preview" && (
        <button
          type="button"
          onClick={onPreviewReload}
          className="ml-auto rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          title="Reload preview to the site's starting state"
        >
          Reset
        </button>
      )}
    </div>
  );
}

function RightTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs ${
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}
