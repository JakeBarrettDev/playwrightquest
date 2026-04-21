import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm, readFile, stat, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionRunner,
} from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
const SANDBOX_ROOT = ".sandbox";

export class LocalRunner implements ExecutionRunner {
  constructor(private readonly projectRoot: string) {}

  async run(req: ExecutionRequest): Promise<ExecutionResult> {
    const started = Date.now();
    const sandboxRoot = join(this.projectRoot, SANDBOX_ROOT);
    await mkdir(sandboxRoot, { recursive: true });
    const runDir = await mkdtemp(join(sandboxRoot, "run-"));
    const specPath = join(runDir, "player.spec.ts");
    const artifactsDir = join(runDir, "artifacts");

    await writeFile(specPath, req.code, "utf8");

    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const playwrightConfig = join(this.projectRoot, "playwright.config.ts");

    const child = spawn(
      "npx",
      [
        "playwright",
        "test",
        "--config",
        playwrightConfig,
        "--project",
        req.browser ?? "chromium",
        "--reporter=line",
        "--output",
        artifactsDir,
      ],
      {
        cwd: this.projectRoot,
        shell: true,
        env: {
          ...process.env,
          PQ_SITE: req.site,
          PQ_RUN_DIR: runDir,
          // Disable Playwright's default worker-per-file sharding for faster single-spec runs.
          CI: "1",
        },
      }
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b: Buffer) => (stdout += b.toString()));
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString()));

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
    const screenshotBase64 = await findFirstScreenshot(artifactsDir);

    const passed = exitCode === 0;
    const errorMessage = passed
      ? undefined
      : extractErrorMessage(stdout) || extractErrorMessage(stderr);

    // Best-effort cleanup; don't fail the request if it errors.
    rm(runDir, { recursive: true, force: true }).catch(() => {});

    return {
      passed,
      exitCode,
      durationMs,
      stdout,
      stderr,
      errorMessage,
      screenshotBase64,
    };
  }
}

async function findFirstScreenshot(dir: string): Promise<string | undefined> {
  try {
    const s = await stat(dir);
    if (!s.isDirectory()) return undefined;
  } catch {
    return undefined;
  }

  const { readdir } = await import("node:fs/promises");
  let candidates: string[];
  try {
    const walk = async (d: string): Promise<string[]> => {
      const entries = await readdir(d, { withFileTypes: true });
      const out: string[] = [];
      for (const e of entries) {
        const p = join(d, e.name);
        if (e.isDirectory()) out.push(...(await walk(p)));
        else if (e.name.endsWith(".png")) out.push(p);
      }
      return out;
    };
    candidates = await walk(dir);
  } catch {
    return undefined;
  }

  if (candidates.length === 0) return undefined;
  const buf = await readFile(candidates[0]);
  return buf.toString("base64");
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
