import { createRunner } from "@/lib/execution";
import type { ExecutionRequest } from "@/lib/execution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Partial<ExecutionRequest>;
  try {
    body = (await req.json()) as Partial<ExecutionRequest>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (typeof body.code !== "string" || body.code.length === 0) {
    return new Response(
      JSON.stringify({ error: "`code` is required and must be a string" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (typeof body.site !== "string" || body.site.length === 0) {
    return new Response(
      JSON.stringify({ error: "`site` is required and must be a string" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const runner = createRunner(process.cwd());
        const result = await runner.run({
          code: body.code as string,
          site: body.site as string,
          challengeId: body.challengeId,
          timeoutMs: body.timeoutMs,
          browser: body.browser,
          onOutput: (line) => enqueue({ type: "output", line }),
        });

        enqueue({ type: "result", result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        enqueue({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
