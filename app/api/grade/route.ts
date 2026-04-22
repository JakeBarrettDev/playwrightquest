import { NextResponse } from "next/server";
import { gradeSubmission } from "@/lib/grading";
import type { GradeRequest } from "@/lib/grading";
import type { GradingProvider } from "@/lib/types/grading";
import { ProviderError } from "@/lib/grading/providers";
import type { ExecutionResult } from "@/lib/execution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PROVIDERS: GradingProvider[] = ["anthropic", "openai", "gemini"];

export async function POST(req: Request) {
  let body: Partial<GradeRequest>;
  try {
    body = (await req.json()) as Partial<GradeRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const error = validate(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const response = await gradeSubmission(process.cwd(), {
      provider: body.provider as GradingProvider,
      apiKey: body.apiKey as string,
      model: body.model,
      challengeId: body.challengeId as string,
      playerCode: body.playerCode as string,
      executionResult: body.executionResult as ExecutionResult,
      hintsUsed: body.hintsUsed,
    });
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof ProviderError) {
      return NextResponse.json(
        { error: err.message, provider: err.provider },
        { status: err.status && err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith("Unknown challenge id:") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function validate(body: Partial<GradeRequest>): string | null {
  if (!body.provider || !VALID_PROVIDERS.includes(body.provider)) {
    return `\`provider\` must be one of: ${VALID_PROVIDERS.join(", ")}`;
  }
  if (typeof body.apiKey !== "string" || body.apiKey.length < 10) {
    return "`apiKey` is required and must be a non-trivial string";
  }
  if (typeof body.challengeId !== "string" || !body.challengeId) {
    return "`challengeId` is required";
  }
  if (typeof body.playerCode !== "string" || !body.playerCode) {
    return "`playerCode` is required";
  }
  if (!body.executionResult || typeof body.executionResult !== "object") {
    return "`executionResult` is required (from /api/execute)";
  }
  const er = body.executionResult as Partial<ExecutionResult>;
  if (typeof er.passed !== "boolean" || typeof er.exitCode !== "number") {
    return "`executionResult` must include at least { passed, exitCode, durationMs, stdout, stderr }";
  }
  return null;
}
