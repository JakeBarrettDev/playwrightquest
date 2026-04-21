import { NextResponse } from "next/server";
import { createRunner } from "@/lib/execution";
import type { ExecutionRequest } from "@/lib/execution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Partial<ExecutionRequest>;
  try {
    body = (await req.json()) as Partial<ExecutionRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.code !== "string" || body.code.length === 0) {
    return NextResponse.json(
      { error: "`code` is required and must be a string" },
      { status: 400 }
    );
  }
  if (typeof body.site !== "string" || body.site.length === 0) {
    return NextResponse.json(
      { error: "`site` is required and must be a string" },
      { status: 400 }
    );
  }

  const runner = createRunner("local", process.cwd());

  try {
    const result = await runner.run({
      code: body.code,
      site: body.site,
      challengeId: body.challengeId,
      timeoutMs: body.timeoutMs,
      browser: body.browser,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
