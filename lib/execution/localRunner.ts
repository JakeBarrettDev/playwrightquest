import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm, readFile, copyFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionRunner,
} from "./types";
import { buildPlaywrightConfig } from "./config";
import { cleanupOldTraces } from "./cleanup";

const DEFAULT_TIMEOUT_MS = 30_000;

export class LocalRunner implements ExecutionRunner {
  constructor(private readonly projectRoot: string) {}

  async run(req: ExecutionRequest): Promise<ExecutionResult> {
    const tracesRoot = join(this.projectRoot, ".sandbox", "traces");
    cleanupOldTraces(tracesRoot).catch(() => {});

    const runId = randomUUID().replace(/-/g, "");
    const started = Date.now();
    const runDir = await mkdtemp(join(tmpdir(), "pq-local-"));

    try {
      await writeFile(join(runDir, "player.spec.ts"), req.code, "utf8");

      const baseUrl = process.env.PQ_BASE_URL ?? "http://localhost:3000";
      const browserName = req.browser ?? "chromium";
      const configContent = buildPlaywrightConfig({
        baseUrl,
        browserName,
        headless: true,
        testDir: runDir,
        testMatch: "player.spec.ts",
        outputDir: join(runDir, "test-results"),
      });
      const configPath = join(runDir, "playwright.config.js");
      await writeFile(configPath, configContent, "utf8");

      const child = spawn(
        "npx",
        [
          "playwright", "test",
          "--config", configPath,
          "--project", browserName,
          "--reporter=line",
        ],
        {
          cwd: this.projectRoot,
          shell: true,
          env: {
            ...process.env,
            PQ_SITE: req.site,
            CI: "1",
          },
        }
      );

      let stdout = "";
      let stderr = "";

      const handleChunk = (chunk: string) => {
        if (req.onOutput) {
          for (const line of chunk.split("\n")) {
            if (line.trim()) req.onOutput(line);
          }
        }
      };

      child.stdout.on("data", (b: Buffer) => {
        const chunk = b.toString();
        stdout += chunk;
        handleChunk(chunk);
      });
      child.stderr.on("data", (b: Buffer) => {
        const chunk = b.toString();
        stderr += chunk;
        handleChunk(chunk);
      });

      const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const exitCode = await new Promise<number>((resolve) => {
        const killer = setTimeout(() => {
          child.kill("SIGKILL");
        }, timeoutMs + 5_000);
        child.on("close", (code) => {
          clearTimeout(killer);
          resolve(code ?? -1);
        });
      });

      const durationMs = Date.now() - started;

      // Copy trace and video to persistent storage before runDir cleanup.
      let savedRunId: string | undefined;
      try {
        const traceZip = await findFirstFile(runDir, ".zip");
        if (traceZip) {
          const traceDest = join(tracesRoot, runId);
          await mkdir(traceDest, { recursive: true });
          await copyFile(traceZip, join(traceDest, "trace.zip"));
          savedRunId = runId;
          const videoWebm = await findFirstFile(runDir, ".webm");
          if (videoWebm) {
            await copyFile(videoWebm, join(traceDest, "video.webm"));
          }
        }
      } catch {
        // Trace copy failure must not fail the run.
      }

      const screenshotBase64 = await findFirstScreenshot(join(runDir, "test-results"));
      const passed = exitCode === 0;
      const errorMessage = passed
        ? undefined
        : extractErrorMessage(stdout) || extractErrorMessage(stderr);

      return {
        passed,
        exitCode,
        durationMs,
        stdout,
        stderr,
        errorMessage,
        screenshotBase64,
        runId: savedRunId,
      };
    } finally {
      rm(runDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function findFirstFile(dir: string, ext: string): Promise<string | undefined> {
  try {
    const { readdir } = await import("node:fs/promises");
    const walk = async (d: string): Promise<string[]> => {
      const entries = await readdir(d, { withFileTypes: true });
      const out: string[] = [];
      for (const e of entries) {
        const p = join(d, e.name);
        if (e.isDirectory()) out.push(...(await walk(p)));
        else if (e.name.endsWith(ext)) out.push(p);
      }
      return out;
    };
    const candidates = await walk(dir);
    return candidates[0];
  } catch {
    return undefined;
  }
}

async function findFirstScreenshot(dir: string): Promise<string | undefined> {
  try {
    const s = await stat(dir);
    if (!s.isDirectory()) return undefined;
  } catch {
    return undefined;
  }
  const path = await findFirstFile(dir, ".png");
  if (!path) return undefined;
  try {
    const buf = await readFile(path);
    return buf.toString("base64");
  } catch {
    return undefined;
  }
}

function extractErrorMessage(output: string): string | undefined {
  const trimmed = output.trim();
  if (!trimmed) return undefined;
  const errorLine = trimmed
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /^Error:|^expect\(|^TimeoutError:|^AssertionError:/i.test(l));
  return errorLine || trimmed.slice(0, 500);
}
