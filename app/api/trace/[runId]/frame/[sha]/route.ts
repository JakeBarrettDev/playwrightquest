import { join } from "node:path";
import { access } from "node:fs/promises";
import { getResourceFromZip } from "@/lib/trace/parser";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string; sha: string }> }
) {
  const { runId, sha } = await params;

  if (!isValidRunId(runId) || !isValidSha(sha)) {
    return new Response("Bad request", { status: 400 });
  }

  const zipPath = join(process.cwd(), ".sandbox", "traces", runId, "trace.zip");

  try {
    await access(zipPath);
  } catch {
    return new Response("Trace not found", { status: 404 });
  }

  try {
    const buffer = getResourceFromZip(zipPath, sha);
    if (!buffer) return new Response("Resource not found", { status: 404 });

    // Web `Response` wants `BodyInit`. Node `Buffer.buffer` may be typed as
    // `ArrayBuffer | SharedArrayBuffer`; copy into a fresh ArrayBuffer so the
    // type narrows and the runtime is a plain non-shared buffer.
    const ab = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(ab).set(buffer);
    return new Response(ab, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Failed to read resource", { status: 500 });
  }
}

function isValidRunId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id);
}

function isValidSha(sha: string): boolean {
  return /^[a-f0-9]{10,64}$/.test(sha);
}
