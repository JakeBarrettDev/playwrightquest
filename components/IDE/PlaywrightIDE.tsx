"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useState } from "react";
import { playwrightDts } from "./playwrightTypes";
import { registerPlaywrightCompletions } from "./completions";

const DEFAULT_CODE = `import { test, expect } from '@playwright/test';

test('guest can complete checkout', async ({ page }) => {
  await page.goto('/sites/bramble-co/');

  // Your test here. Start typing 'page.' to see preferred locators first.
});
`;

type Mode = "terminal" | "headed" | "debug";

interface ExecutionResultShape {
  passed: boolean;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  errorMessage?: string;
  screenshotBase64?: string;
}

interface Props {
  initialCode?: string;
  site?: string;
  challengeId?: string;
}

export default function PlaywrightIDE({
  initialCode,
  site = "bramble-co",
  challengeId,
}: Props) {
  const [code, setCode] = useState(initialCode ?? DEFAULT_CODE);
  const [mode, setMode] = useState<Mode>("terminal");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResultShape | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMount: OnMount = useCallback((_editor, monaco) => {
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
    });
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      playwrightDts,
      "file:///node_modules/@playwright/test/index.d.ts"
    );
    registerPlaywrightCompletions(monaco);
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, site, challengeId }),
      });
      const data = (await res.json()) as ExecutionResultShape | { error: string };
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error : `HTTP ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200">
        <div className="text-sm font-semibold">Playwright IDE</div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-zinc-400">Mode</span>
            <select
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="terminal">Terminal only</option>
              <option value="headed">Headed</option>
              <option value="debug">Debug</option>
            </select>
          </label>
          <button
            type="button"
            className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleRun}
            disabled={running}
          >
            {running ? "Running…" : "Run Test"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1">
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

        <ResultPanel result={result} error={error} running={running} />
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  error,
  running,
}: {
  result: ExecutionResultShape | null;
  error: string | null;
  running: boolean;
}) {
  if (!running && !result && !error) return null;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="max-h-[40vh] overflow-auto p-3 font-mono text-xs">
        {running && <div className="text-zinc-400">Running Playwright…</div>}

        {error && (
          <div className="text-rose-400">
            <div className="font-semibold">Request failed</div>
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={
                  result.passed
                    ? "rounded bg-emerald-700 px-2 py-0.5 text-white"
                    : "rounded bg-rose-700 px-2 py-0.5 text-white"
                }
              >
                {result.passed ? "PASS" : "FAIL"}
              </span>
              <span className="text-zinc-400">
                exit {result.exitCode} · {(result.durationMs / 1000).toFixed(2)}s
              </span>
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
                <summary className="cursor-pointer text-zinc-400">
                  stdout
                </summary>
                <pre className="whitespace-pre-wrap text-zinc-300">
                  {result.stdout}
                </pre>
              </details>
            )}

            {result.stderr && (
              <details>
                <summary className="cursor-pointer text-zinc-400">
                  stderr
                </summary>
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
    </div>
  );
}
