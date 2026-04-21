import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionRunner,
} from "./types";

/**
 * Placeholder for the Docker-based sandbox described in Section 10 of the brief.
 * Keeps the interface honest so LocalRunner can be swapped out without
 * restructuring callers when we're ready to ship outside local dev.
 */
export class DockerRunner implements ExecutionRunner {
  run(_req: ExecutionRequest): Promise<ExecutionResult> {
    throw new Error(
      "DockerRunner is not implemented yet. Use LocalRunner for local dev."
    );
  }
}
