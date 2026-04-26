import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const TRACE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export async function cleanupOldTraces(tracesRoot: string): Promise<void> {
  const now = Date.now();
  try {
    const entries = await readdir(tracesRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = join(tracesRoot, entry.name);
      const s = await stat(dirPath);
      if (now - s.mtimeMs > TRACE_MAX_AGE_MS) {
        await rm(dirPath, { recursive: true, force: true });
      }
    }
  } catch {
    // traces dir may not exist yet
  }
}
