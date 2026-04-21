export interface ExecutionRequest {
  code: string;
  site: string;
  challengeId?: string;
  timeoutMs?: number;
  browser?: "chromium" | "firefox" | "webkit";
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
}

export interface ExecutionRunner {
  run(req: ExecutionRequest): Promise<ExecutionResult>;
}
