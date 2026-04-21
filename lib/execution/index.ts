import { LocalRunner } from "./localRunner";
import { DockerRunner } from "./dockerRunner";
import type { ExecutionRunner } from "./types";

export type RunnerKind = "local" | "docker";

export function createRunner(
  kind: RunnerKind,
  projectRoot: string
): ExecutionRunner {
  switch (kind) {
    case "local":
      return new LocalRunner(projectRoot);
    case "docker":
      return new DockerRunner();
  }
}

export type { ExecutionRequest, ExecutionResult, ExecutionRunner } from "./types";
