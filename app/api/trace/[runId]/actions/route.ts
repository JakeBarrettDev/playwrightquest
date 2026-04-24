import { join } from "node:path";
import { access } from "node:fs/promises";
import { parseTraceZip } from "@/lib/trace/parser";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!isValidRunId(runId)) {
    return Response.json({ error: "Invalid runId" }, { status: 400 });
  }

  const zipPath = join(process.cwd(), ".sandbox", "traces", runId, "trace.zip");

  try {
    await access(zipPath);
  } catch {
    return Response.json({ error: "Trace not found" }, { status: 404 });
  }

  try {
    const steps = parseTraceZip(zipPath);
    return Response.json({ steps });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Failed to parse trace: ${message}` }, { status: 500 });
  }
}

function isValidRunId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id);
}
