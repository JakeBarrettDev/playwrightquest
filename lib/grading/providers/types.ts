import type { GradingProvider, GradingResult } from "../../types/grading";

export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}

export interface ProviderGradeInput {
  apiKey: string;
  model?: string;
  /** Authoritative block — identical across every grading request. Heavily cacheable. */
  authoritative: string;
  /** Site block — identical across every request for the same site. Cacheable. */
  site: string;
  /** Dynamic block — varies per request. Not cached. */
  dynamic: string;
  /** JSON Schema for the structured response. */
  responseSchema: Record<string, unknown>;
}

export interface ProviderGradeOutput {
  /** Model identifier actually used, for telemetry. */
  model: string;
  result: GradingResult;
  usage?: ProviderUsage;
}

export interface LLMProvider {
  name: GradingProvider;
  defaultModel: string;
  grade(input: ProviderGradeInput): Promise<ProviderGradeOutput>;
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: GradingProvider,
    public readonly status: number | undefined,
    message: string
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
