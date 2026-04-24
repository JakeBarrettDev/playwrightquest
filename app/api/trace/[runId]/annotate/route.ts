import { join } from "node:path";
import { access } from "node:fs/promises";
import { parseTraceZip } from "@/lib/trace/parser";
import type { AnnotatedComment } from "@/lib/trace/types";
import type { LineComment } from "@/lib/types/grading";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!isValidRunId(runId)) {
    return Response.json({ error: "Invalid runId" }, { status: 400 });
  }

  let body: { lineComments?: LineComment[] };
  try {
    body = (await req.json()) as { lineComments?: LineComment[] };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const lineComments = body.lineComments ?? [];

  const zipPath = join(process.cwd(), ".sandbox", "traces", runId, "trace.zip");

  let steps: Awaited<ReturnType<typeof parseTraceZip>>;
  try {
    await access(zipPath);
    steps = parseTraceZip(zipPath);
  } catch {
    // No trace available — return all comments as general notes.
    const annotated: AnnotatedComment[] = lineComments.map((c) => ({
      stepIndex: null,
      type: c.type,
      message: c.message,
      citation: c.citation,
    }));
    return Response.json({ annotatedComments: annotated });
  }

  const annotated: AnnotatedComment[] = lineComments.map((comment) => {
    const sourceLine = comment.line;
    let bestStep: number | null = null;
    let bestDelta = Infinity;

    for (const step of steps) {
      if (step.sourceLine === undefined) continue;
      const delta = Math.abs(step.sourceLine - sourceLine);
      if (delta <= 2 && delta < bestDelta) {
        bestDelta = delta;
        bestStep = step.index;
      }
    }

    return {
      stepIndex: bestStep,
      type: comment.type,
      message: comment.message,
      citation: comment.citation,
    };
  });

  return Response.json({ annotatedComments: annotated });
}

function isValidRunId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id);
}
