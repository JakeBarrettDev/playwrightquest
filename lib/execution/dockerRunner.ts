import { spawn, spawnSync } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  rm,
  readFile,
  readdir,
  copyFile,
  mkdir,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, platform } from "node:os";
import { randomUUID } from "node:crypto";
import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionRunner,
} from "./types";
import { buildPlaywrightConfig } from "./config";
import { cleanupOldTraces } from "./cleanup";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.59.1-noble";
const DEFAULT_TIMEOUT_MS = 30_000;

export class DockerRunner implements ExecutionRunner {
  constructor(private readonly projectRoot: string) {}

  async run(request: ExecutionRequest): Promise<ExecutionResult> {
    assertDockerAvailable();

    const tracesRoot = join(this.projectRoot, ".sandbox", "traces");
    cleanupOldTraces(tracesRoot).catch(() => {});

    const runId = randomUUID().replace(/-/g, "");
    const started = Date.now();
    const runDir = await mkdtemp(join(tmpdir(), "pq-docker-"));

    try {
      await writeFile(join(runDir, "player.spec.ts"), request.code, "utf8");

      const baseUrl = resolveBaseUrl();
      const browserName = request.browser ?? "chromium";
      const headed = request.headed ?? false;
      const configContent = buildPlaywrightConfig({
        baseUrl,
        browserName,
        headless: !headed,
      });
      await writeFile(join(runDir, "playwright.config.js"), configContent, "utf8");

      const args = buildDockerArgs(runDir, request.site, baseUrl);
      args.push(
        PLAYWRIGHT_IMAGE,
        "npx", "playwright", "test",
        "/work/player.spec.ts",
        "--config", "/work/playwright.config.js"
      );

      const proc = spawn("docker", args, { shell: false });

      let stdoutBuf = "";
      let stderrBuf = "";

      const handleChunk = (chunk: string) => {
        if (request.onOutput) {
          for (const line of chunk.split("\n")) {
            if (line.trim()) request.onOutput(line);
          }
        }
      };

      proc.stdout.on("data", (b: Buffer) => {
        const chunk = b.toString();
        stdoutBuf += chunk;
        handleChunk(chunk);
      });
      proc.stderr.on("data", (b: Buffer) => {
        const chunk = b.toString();
        stderrBuf += chunk;
        handleChunk(chunk);
      });

      const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const exitCode = await new Promise<number>((resolve) => {
        const killer = setTimeout(() => {
          proc.kill("SIGKILL");
        }, timeoutMs + 5_000);
        proc.on("close", (code) => {
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

      const screenshotBase64 = await findFirstScreenshot(runDir);
      const passed = exitCode === 0;
      const errorMessage = passed
        ? undefined
        : extractErrorMessage(stdoutBuf) || extractErrorMessage(stderrBuf);

      return {
        passed,
        exitCode,
        durationMs,
        stdout: stdoutBuf,
        stderr: stderrBuf,
        errorMessage,
        screenshotBase64,
        runId: savedRunId,
      };
    } finally {
      rm(runDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function assertDockerAvailable(): void {
  const result = spawnSync("docker", ["--version"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      "Docker is not available. Install Docker Desktop or set EXECUTION_RUNNER=local."
    );
  }
}

function resolveBaseUrl(): string {
  if (process.env.PQ_BASE_URL) return process.env.PQ_BASE_URL;
  return platform() === "linux"
    ? "http://localhost:3000"
    : "http://host.docker.internal:3000";
}

function buildDockerArgs(runDir: string, site: string, baseUrl: string): string[] {
  const args = [
    "run", "--rm",
    "-v", `${runDir}:/work`,
    "-e", `PQ_SITE=${site}`,
    "-e", `PQ_BASE_URL=${baseUrl}`,
    "-e", "CI=1",
  ];
  if (platform() === "linux") {
    args.push("--network=host");
  }
  return args;
}

async function findFirstFile(dir: string, ext: string): Promise<string | undefined> {
  try {
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

async function findFirstScreenshot(runDir: string): Promise<string | undefined> {
  const path = await findFirstFile(join(runDir, "test-results"), ".png");
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
