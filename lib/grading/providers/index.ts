import type { GradingProvider } from "../../types/grading";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import type { LLMProvider } from "./types";

export function getProvider(kind: GradingProvider): LLMProvider {
  switch (kind) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
  }
}

export { ProviderError } from "./types";
export type {
  LLMProvider,
  ProviderGradeInput,
  ProviderGradeOutput,
  ProviderUsage,
} from "./types";
export { GRADING_RESULT_SCHEMA, GRADING_TOOL_NAME } from "./schema";
