import { LocalRunner } from "./localRunner";
import { DockerRunner } from "./dockerRunner";
import type { ExecutionRunner } from "./types";

export function createRunner(projectRoot: string): ExecutionRunner {
  const kind = process.env.EXECUTION_RUNNER ?? "local";
  if (kind === "docker") return new DockerRunner(projectRoot);
  return new LocalRunner(projectRoot);
}

export type { ExecutionRequest, ExecutionResult, ExecutionRunner } from "./types";
