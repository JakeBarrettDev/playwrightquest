import { join } from "node:path";
import { access, readFile } from "node:fs/promises";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!isValidRunId(runId)) {
    return new Response("Bad request", { status: 400 });
  }

  const videoPath = join(process.cwd(), ".sandbox", "traces", runId, "video.webm");

  try {
    await access(videoPath);
  } catch {
    return new Response("No video recorded for this run", { status: 404 });
  }

  try {
    const buffer = await readFile(videoPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "video/webm",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Failed to read video", { status: 500 });
  }
}

function isValidRunId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id);
}
