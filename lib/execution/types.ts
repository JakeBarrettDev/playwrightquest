export interface ExecutionRequest {
  code: string;
  site: string;
  challengeId?: string;
  timeoutMs?: number;
  browser?: "chromium" | "firefox" | "webkit";
  /** Run with headless: false and video recording (Docker only). */
  headed?: boolean;
  /** Called with each stdout/stderr line as it arrives. Optional. */
  onOutput?: (line: string) => void;
}

export interface ExecutionResult {
  passed: boolean;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  errorMessage?: string;
  errorStack?: string;
  screenshotBase64?: string;
  /** Present when a trace was recorded; used to fetch trace data via /api/trace/[runId]. */
  runId?: string;
}

export interface ExecutionRunner {
  run(req: ExecutionRequest): Promise<ExecutionResult>;
}
