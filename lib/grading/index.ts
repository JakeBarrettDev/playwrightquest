import type { GradeRequest, GradeResponse } from "../types/grading";
import { assembleGradingContext, renderContextBlocks } from "./contextAssembler";
import { formatRubricForPrompt, DEFAULT_RUBRIC } from "./rubric";
import { getProvider, GRADING_RESULT_SCHEMA } from "./providers";

export async function gradeSubmission(
  projectRoot: string,
  req: GradeRequest
): Promise<GradeResponse> {
  const started = Date.now();

  const pkg = await assembleGradingContext({
    projectRoot,
    challengeId: req.challengeId,
    playerCode: req.playerCode,
    executionResult: req.executionResult,
  });

  const rendered = renderContextBlocks(pkg);
  const rubricText = formatRubricForPrompt(DEFAULT_RUBRIC);

  // Rubric goes at the top of the dynamic block so each run sees the active
  // weights, but the weights themselves are stable so prefix caching still
  // benefits the authoritative/site blocks above it.
  const dynamic = `${rubricText}\n\n${rendered.dynamic}\n\nhintsUsed: ${req.hintsUsed ?? 0}`;

  const provider = getProvider(req.provider);
  const out = await provider.grade({
    apiKey: req.apiKey,
    model: req.model,
    authoritative: rendered.authoritative,
    site: rendered.site,
    dynamic,
    responseSchema: GRADING_RESULT_SCHEMA as unknown as Record<string, unknown>,
  });

  const result = normalizeResult(out.result, req, pkg.dynamic.challenge.xpReward, pkg.dynamic.challenge.hintPenalty);

  return {
    result,
    meta: {
      provider: req.provider,
      model: out.model,
      durationMs: Date.now() - started,
      usage: out.usage,
    },
  };
}

/**
 * Defensive normalization: the LLM sometimes ignores xpAwarded math or drifts
 * on hintsUsed. Recompute both server-side so the client always gets a
 * consistent score regardless of provider.
 */
function normalizeResult(
  result: GradeResponse["result"],
  req: GradeRequest,
  xpReward: number,
  hintPenalty: number
): GradeResponse["result"] {
  const hintsUsed = req.hintsUsed ?? 0;
  const xp = Math.max(
    0,
    Math.round((result.score * xpReward) / 100) - hintsUsed * hintPenalty
  );
  return {
    ...result,
    hintsUsed,
    xpAwarded: xp,
  };
}

export type { GradeRequest, GradeResponse } from "../types/grading";
export { GRADING_RESULT_SCHEMA } from "./providers";
export { DEFAULT_RUBRIC } from "./rubric";
