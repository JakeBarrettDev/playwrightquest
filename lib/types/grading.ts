import type { Challenge } from "./challenge";
import type { DOMManifestEntry } from "./manifest";
import type { ExecutionResult } from "../execution";

/**
 * Assembled per grading request. Structured for prompt-cache alignment:
 * the `authoritative` block (Playwright docs + rubric rules) is static
 * per deploy; the `site` block is static per site; `dynamic` is per-request.
 * Provider adapters place cache breakpoints at the authoritative/site and
 * site/dynamic boundaries.
 */
export interface GradingContextPackage {
  /** Static per deploy — concatenated Playwright docs + rubric rules. */
  authoritative: {
    graderInstructions: string;
    playwrightDocs: string;
    rubricRules: string;
  };
  /** Static per site — DOM manifest slice relevant to this challenge. */
  site: {
    id: string;
    baseUrl: string;
    manifestEntries: DOMManifestEntry[];
    challengeNotes: string[];
  };
  /** Dynamic — challenge + player submission. */
  dynamic: {
    challenge: Challenge;
    playerCode: string;
    executionResult: ExecutionResult;
    retrievedCorpus: string[];
  };
}

export type LineCommentType = "error" | "warning" | "suggestion" | "praise";

export interface LineComment {
  line: number;
  type: LineCommentType;
  message: string;
  /** Optional citation pointing to the corpus file that backs the comment. */
  citation?: string;
}

export interface GradingResult {
  passed: boolean;
  score: number;
  breakdown: {
    selector_quality: number;
    assertion_quality: number;
    acceptance_criteria_coverage: number;
    code_quality: number;
  };
  feedback: {
    summary: string;
    lineComments: LineComment[];
    failureArchaeology?: string;
    bestPracticeNotes: string[];
  };
  hintsUsed: number;
  xpAwarded: number;
}

export type GradingProvider = "anthropic" | "openai" | "gemini";

export interface GradeRequest {
  provider: GradingProvider;
  apiKey: string;
  /** Optional model override. Each provider has a sane default. */
  model?: string;
  challengeId: string;
  playerCode: string;
  executionResult: ExecutionResult;
  hintsUsed?: number;
}

export interface GradeResponse {
  result: GradingResult;
  meta: {
    provider: GradingProvider;
    model: string;
    durationMs: number;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      cachedInputTokens?: number;
    };
  };
}
