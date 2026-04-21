"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useState } from "react";
import { playwrightDts } from "./playwrightTypes";
import { registerPlaywrightCompletions } from "./completions";

const DEFAULT_CODE = `import { test, expect } from '@playwright/test';

test('guest can complete checkout', async ({ page }) => {
  await page.goto('http://localhost:3000/sites/bramble-co/');

  // Your test here. Start typing 'page.' to see preferred locators first.
});
`;

type Mode = "terminal" | "headed" | "debug";

interface Props {
  initialCode?: string;
  onRun?: (code: string, mode: Mode) => void;
}

export default function PlaywrightIDE({ initialCode, onRun }: Props) {
  const [code, setCode] = useState(initialCode ?? DEFAULT_CODE);
  const [mode, setMode] = useState<Mode>("terminal");
  const [running, setRunning] = useState(false);

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
    try {
      if (onRun) {
        await onRun(code, mode);
      } else {
        // Stub until Chunk 4 wires in /api/execute.
        await new Promise((r) => setTimeout(r, 600));
      }
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
    </div>
  );
}
