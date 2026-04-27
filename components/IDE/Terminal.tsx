"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { Challenge } from "@/lib/types/challenge";
import type { ExecutionResult } from "@/lib/execution";

export type TerminalCommand =
  | { kind: "standard" }
  | { kind: "headed" }
  | { kind: "ui" }
  | { kind: "debug" };

interface Props {
  challenge: Challenge;
  code: string;
  onExecutionComplete: (result: ExecutionResult, command: TerminalCommand) => void;
}

const STARTUP = [
  "PlaywrightStagecraft Terminal",
  "Run your tests as you would locally:",
  "",
  "  npx playwright test              run tests (standard)",
  "  npx playwright test --headed     run with video recording",
  "  npx playwright test --ui         open Trace Player after run",
  "  npx playwright test --debug      step through in Trace Player",
  "",
  "Your test file is pre-loaded. Just run.",
  "",
];

export default function Terminal({ challenge, code, onExecutionComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store terminal instance and input buffer without causing re-renders.
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const inputRef = useRef("");
  const runningRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    // Dynamic import keeps xterm out of the SSR bundle.
    let disposed = false;
    (async () => {
      const { Terminal: XTerm } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (disposed || !containerRef.current) return;

      const term = new XTerm({
        theme: {
          background: "#09090b",
          foreground: "#e4e4e7",
          cursor: "#a1a1aa",
          selectionBackground: "#3f3f46",
        },
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        cursorBlink: true,
        convertEol: true,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      const resizeObserver = new ResizeObserver(() => fit.fit());
      resizeObserver.observe(containerRef.current);

      // Print startup message.
      for (const line of STARTUP) term.writeln(line);
      writePrompt(term);

      // Handle input.
      term.onData((data) => {
        if (runningRef.current) return;
        if (data === "\r") {
          const cmd = inputRef.current.trim();
          inputRef.current = "";
          term.writeln("");
          handleCommand(cmd, term, challenge, codeRef.current, runningRef, onCompleteRef.current);
        } else if (data === "") {
          // Backspace
          if (inputRef.current.length > 0) {
            inputRef.current = inputRef.current.slice(0, -1);
            term.write("\b \b");
          }
        } else if (data >= " ") {
          inputRef.current += data;
          term.write(data);
        }
      });

      termRef.current = term;

      return () => {
        resizeObserver.disconnect();
        term.dispose();
      };
    })();

    return () => {
      disposed = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep code and callbacks up-to-date in the closure via refs. The xterm
  // setup effect runs once at mount and captures these refs; we mutate them
  // when props change so the long-lived terminal callback always reads the
  // latest values without re-creating the terminal instance.
  const codeRef = useRef(code);
  const onCompleteRef = useRef(onExecutionComplete);
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { codeRef.current = code; }, [code]);
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { onCompleteRef.current = onExecutionComplete; }, [onExecutionComplete]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-zinc-950"
      // Prevent the IDE's keyboard handler from intercepting arrow keys inside xterm.
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}

function writePrompt(term: import("@xterm/xterm").Terminal) {
  term.write("\r\n\x1b[32m$\x1b[0m ");
}

async function handleCommand(
  raw: string,
  term: import("@xterm/xterm").Terminal,
  challenge: Challenge,
  code: string,
  runningRef: MutableRefObject<boolean>,
  onExecutionComplete: Props["onExecutionComplete"]
) {
  const normalized = raw.replace(/\s+/g, " ").trim();

  if (!normalized) {
    writePrompt(term);
    return;
  }

  // Classify command.
  let command: TerminalCommand | null = null;
  let note: string | null = null;

  if (/^npx playwright test(\s|$)/.test(normalized)) {
    if (normalized.includes("--debug")) {
      command = { kind: "debug" };
      note = "Debug mode launched in Trace Player — use arrow keys to step through.";
    } else if (normalized.includes("--ui")) {
      command = { kind: "ui" };
      note = "UI mode isn't available in-browser — opening the built-in Trace Player instead.";
    } else if (normalized.includes("--headed")) {
      command = { kind: "headed" };
      note = "Running headed via Docker with Xvfb. Video recorded.";
    } else if (normalized.includes("--trace")) {
      command = { kind: "standard" };
      note = "Trace is always recorded in PlaywrightStagecraft.";
    } else {
      command = { kind: "standard" };
    }
  } else {
    term.writeln(
      `\x1b[33mUnknown command.\x1b[0m Try: npx playwright test [--headed] [--ui] [--debug]`
    );
    writePrompt(term);
    return;
  }

  if (note) term.writeln(`\x1b[36m→ ${note}\x1b[0m`);

  runningRef.current = true;

  try {
    const res = await fetch("/api/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        site: challenge.site,
        challengeId: challenge.id,
        headed: command.kind === "headed",
      }),
    });

    if (!res.ok || !res.body) {
      term.writeln(`\x1b[31mRequest failed: HTTP ${res.status}\x1b[0m`);
      writePrompt(term);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: ExecutionResult | null = null;

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
            | { type: "result"; result: ExecutionResult }
            | { type: "error"; message: string };
          if (msg.type === "output") {
            term.writeln(msg.line);
          } else if (msg.type === "result") {
            result = msg.result;
          } else if (msg.type === "error") {
            term.writeln(`\x1b[31mError: ${msg.message}\x1b[0m`);
          }
        } catch {
          // skip malformed
        }
      }
    }

    if (result) {
      const status = result.passed
        ? "\x1b[32mPASS\x1b[0m"
        : "\x1b[31mFAIL\x1b[0m";
      term.writeln(`\n${status} — ${(result.durationMs / 1000).toFixed(2)}s`);

      if (!result.runId) {
        term.writeln(
          "\x1b[33m→ Trace Player requires Docker mode. Set EXECUTION_RUNNER=docker and ensure Docker Desktop is running.\x1b[0m"
        );
      }

      onExecutionComplete(result, command);
    }
  } catch (e) {
    term.writeln(`\x1b[31m${e instanceof Error ? e.message : String(e)}\x1b[0m`);
  } finally {
    runningRef.current = false;
    writePrompt(term);
  }
}
